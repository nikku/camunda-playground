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
  query as domQuery
} from 'min-dom';

import {
  createActivityMarker,
  createConnectionMarker
} from './ProcessInstanceUtil';

const FILL = '#52B415';

export default class ProcessInstance {
  constructor(canvas, elementRegistry, eventBus) {
    this._canvas = canvas;
    this._elementRegistry = elementRegistry;

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
    console.log(processInstance);

    const connections = this._getConnections(processInstance);

    connections.forEach(connection => {
      this._addConnectionMarker(connection);
    });

    const activities = this._getActivities(processInstance, activity => !activity.endTime);

    activities.forEach(activity => {
      this._addActivityMarker(activity);
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

    function getConnections(activity) {
      const incoming = filter(activity.incoming, connection => {
        return find(activities, matchPattern({ id: connection.source.id }));
      });

      const outgoing = filter(activity.outgoing, connection => {
        return find(activities, matchPattern({ id: connection.target.id }));
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
  }
}

ProcessInstance.$inject = [
  'canvas',
  'elementRegistry',
  'eventBus'
];

function isConnection(element) {
  return !!element.waypoints;
}