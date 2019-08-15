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
        refX: 5,
        refY: 5,
        markerWidth: 6,
        markerHeight: 6,
        orient: 'auto-start-reverse'
      });

      const path = svgCreate('path');

      svgAttr(path, {
        d: 'M 0 0 L 10 5 L 0 10 z',
        fill: FILL
      });

      svgAppend(marker, path);

      svgAppend(defs, marker);
    });
  }

  show(processInstance) {
    const { id } = processInstance;

    const connections = this._getConnections(processInstance);

    connections.forEach(connection => {
      this._addConnectionMarker(connection);
    });

    // activities that have NOT ended
    const activities = this._getActivities(processInstance, activity => !activity.endTime);

    activities.forEach(activity => {
      // this._addActivityMarker(activity);

      const activityId = find(processInstance.trace, a => a.activityId === activity.id).id.split(':')[1];

      this._addActivityButton(activity, activityId, id);
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

  _addActivityButton(activity, activityId, processInstanceId) {
    if (is(activity, 'bpmn:UserTask')) {
      const url = `http://localhost:8080/camunda/app/tasklist/default/#/?searchQuery=%5B%7B%22type%22:%22processInstanceId%22,%22operator%22:%22eq%22,%22value%22:%22${ processInstanceId }%22,%22name%22:%22%22%7D%5D&filter=f331efa7-bf6c-11e9-8f11-0028f8fb8528&sorting=%5B%7B%22sortBy%22:%22created%22,%22sortOrder%22:%22desc%22%7D%5D&task=${ activityId }`;

      this._addOverlay({
        element: activity,
        html: domify(`<a class="element-overlay info" target="_blank" href="${ url }"><i class="fas fa-external-link-alt"></i> Tasklist</a>`)
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

  _addConnectionMarker(connection) {
    svgAppend(this._getLayer(), createConnectionMarker(connection))
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