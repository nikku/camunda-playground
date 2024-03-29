import {
  filter,
  find,
  forEach,
  assign,
  isFunction,
  map,
  matchPattern,
  uniqueBy,
  values
} from 'min-dash';

import {
  append as svgAppend,
  attr as svgAttr,
  clear as svgClear,
  create as svgCreate
} from 'tiny-svg';

import {
  domify,
  query as domQuery
} from 'min-dom';

import { is } from 'bpmn-js/lib/util/ModelUtil';

import { createCurve } from 'svg-curves';
import { getExternalTaskTopic } from '../../util';

const FILL = '#52B415';

const OFFSET_TOP = -15,
      OFFSET_RIGHT = 15;

export default class ProcessInstance {
  constructor(canvas, elementRegistry, eventBus, overlays) {
    this._canvas = canvas;
    this._elementRegistry = elementRegistry;
    this._overlays = overlays;

    eventBus.on('import.done', () => {
      let defs = domQuery('defs', canvas._svg);

      if (!defs) {
        defs = svgCreate('defs');

        svgAppend(canvas._svg, defs);
      }

      const marker = svgCreate('marker');

      svgAttr(marker, {
        id: 'arrow',
        viewBox: '0 0 10 10',
        refX: 7,
        refY: 5,
        markerWidth: 4,
        markerHeight: 4,
        orient: 'auto-start-reverse'
      });

      const path = svgCreate('path');

      svgAttr(path, {
        d: 'M 0 0 L 10 5 L 0 10 z',
        fill: FILL,
        stroke: 'blue',
        strokeWidth: 0
      });

      svgAppend(marker, path);

      svgAppend(defs, marker);
    });
  }

  show(processInstance) {
    const { id: processInstanceId } = processInstance;

    const connections = this._getConnections(processInstance);

    connections.forEach(connection => {
      this._addConnectionMarker(connection, {
        markerEnd: 'url(#arrow)'
      });
    });

    const dottedConnections = this._getDottedConnections(connections);

    dottedConnections.forEach(connection => {
      this._addConnectionMarker(connection, {
        strokeDasharray: '1 8',
        strokeLinecap: 'round'
      });
    });

    // activities that have NOT ended
    const activities = this._getActivities(processInstance, activity => !activity.endTime);

    activities.forEach(activity => {
      const taskId = find(processInstance.trace, a => a.activityId === activity.id).taskId;

      this._addActivityButton(activity, taskId, processInstanceId);
    });
  }

  _getActivities(processInstance, filterFn) {
    const elementRegistry = this._elementRegistry;

    const { trace } = processInstance;

    let activities = values(trace);

    if (isFunction(filterFn)) {
      activities = filter(activities, filterFn);
    }

    return map(activities, ({ activityId }) => elementRegistry.get(activityId));
  }

  _getConnections(processInstance) {
    const activities = this._getActivities(processInstance);

    let connections = [];

    function isFinished(activity) {
      return find(processInstance.trace, matchPattern({ activityId: activity.id })).endTime !== null;
    }

    function getConnections(activity) {
      const incoming = filter(activity.incoming, connection => {
        const found = find(activities, matchPattern({ id: connection.source.id }));

        const finished = isFinished(found);

        return found && finished;
      });

      const outgoing = filter(activity.outgoing, connection => {
        const found = find(activities, matchPattern({ id: connection.target.id }));

        const finished = isFinished(activity);

        return found && finished;
      });

      return [
        ...incoming,
        ...outgoing
      ];
    }

    forEach(activities, activity => {
      connections = uniqueBy('id', [
        ...connections,
        ...getConnections(activity)
      ]);
    });

    return connections;
  }

  _getDottedConnections(connections) {
    let dottedConnections = [];

    connections.forEach(connection => {
      const { target } = connection;

      connections.forEach(c => {
        const { source } = c;

        if (source === target) {
          dottedConnections.push({
            waypoints: [
              connection.waypoints[ connection.waypoints.length - 1],
              getMid(target),
              c.waypoints[0]
            ]
          });
        }
      });
    });

    return dottedConnections;
  }

  _addActivityButton(activity, activityId, processInstanceId) {
    if (is(activity, 'bpmn:UserTask')) {
      const url = getTasklistUrl(activityId, processInstanceId);

      this._addOverlay({
        element: activity,
        html: domify(`
          <a class="element-overlay" target="_blank" href="${ url }" title="Complete task in Camunda Tasklist">
            <svg width="1.2em" height="1.2em" class="icon" viewBox="0 0 12 16" fill="currentColor" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"></path></svg>
            <span class="long">Tasklist</span>
          </a>
        `)
      });
    }

    if (isExternalTask(activity)) {

      const topic = getExternalTaskTopic(activity);

      this._addOverlay({
        element: activity,
        html: domify(`
          <span class="element-overlay">
            <svg width="1.2em" height="1.2em" class="icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"></path></svg>
            <span class="long note">
              Execute through <code>${topic}</code> topic using an <a target="_blank" href="https://docs.camunda.org/manual/7.19/user-guide/ext-client/">external task worker</a>.
            </span>
          </span>
        `)
      });
    }
  }

  _addOverlay({ element, html, position }) {
    var defaultPosition = {
      top: OFFSET_TOP,
      right: OFFSET_RIGHT
    };

    this._overlays.add(element, 'process-instance', {
      position: position || defaultPosition,
      html: html,
      show: {
        minZoom: 0.5
      }
    });
  }

  _removeOverlays() {
    this._overlays.remove({ type: 'process-instance' });
  }

  _addConnectionMarker(connection, attrs = {}) {

    attrs = assign({
      stroke: FILL,
      strokeWidth: 4
    }, attrs);

    svgAppend(this._getLayer(), createCurve(connection.waypoints, attrs));
  }

  _getLayer() {
    return this._canvas.getLayer('processInstance', 1);
  }

  clear() {
    svgClear(this._getLayer());

    this._removeOverlays();
  }
}

ProcessInstance.$inject = [
  'canvas',
  'elementRegistry',
  'eventBus',
  'overlays'
];

function getTasklistUrl(taskId, processInstanceId) {
  const searchQuery = [
    {
      type: 'processInstanceId',
      operator: 'eq',
      value: processInstanceId,
      name: ''
    }
  ];

  const url = `http://localhost:8080/camunda/app/tasklist/default/#/?searchQuery=${ JSON.stringify(searchQuery) }&task=${ taskId }`;

  return encodeURI(url);
}

function getMid(shape) {
  return {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2
  };
}

function isExternalTask(activity) {
  const like = is(activity, 'camunda:ServiceTaskLike');

  if (!like) {
    return false;
  }

  return !!getExternalTaskTopic(activity);
}
