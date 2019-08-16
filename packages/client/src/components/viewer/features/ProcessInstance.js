import {
  filter,
  find,
  forEach,
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

import {
  createActivityMarker,
  createConnectionMarker
} from './ProcessInstanceUtil';

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
      this._addConnectionMarker(connection);
    });

    const dottedConnections = this._getDottedConnections(connections);

    dottedConnections.forEach(connection => {
      this._addConnectionMarker(connection, {
        strokeDasharray: '1 8',
        strokeLinecap: 'round',
        marker: null
      });
    });

    // activities that have NOT ended
    const activities = this._getActivities(processInstance, activity => !activity.endTime);

    activities.forEach(activity => {
      // this._addActivityMarker(activity);

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
          <a class="element-overlay info" target="_blank" href="${ url }">
            <svg width="1.2em" height="1.2em" class="icon" viewBox="0 0 12 16" fill="currentColor" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"></path></svg> Tasklist <span class="long">Tasklist</span>
          </a>
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

  _addMarker(element) {
    if (isConnection(element)) {
      this._addConnectionMarker(element);

      return;
    }

    // this._addActivityMarker(element);
  }

  _addActivityMarker(activity) {
    svgAppend(this._getLayer(), createActivityMarker(activity))
  }

  _addConnectionMarker(connection, attrs) {
    svgAppend(this._getLayer(), createConnectionMarker(connection, attrs))
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

function isConnection(element) {
  return !!element.waypoints;
}

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