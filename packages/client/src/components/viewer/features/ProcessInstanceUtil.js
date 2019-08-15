import { append, attr, create } from "tiny-svg";

import { isObject, isUndefined } from "min-dash";

const FILL = '#52B415',
      STROKE_WIDTH = 3;

export function createActivityMarker(activity) {
  const circle = create('circle');

  const activityMid = {
    x: activity.x + activity.width / 2,
    y: activity.y + activity.height / 2
  };

  attr(circle, {
    cx: activityMid.x,
    cy: activityMid.y,
    r: 10,
    fill: 'none',
    stroke: FILL,
    strokeWidth: STROKE_WIDTH
  });

  return circle;
}

export function createConnectionMarker(connection) {
  const points = connection.waypoints;

  const path = create("path");

  const data = getData(points);

  attr(path, "d", data);

  attr(path, {
    fill: "none",
    stroke: FILL,
    strokeWidth: STROKE_WIDTH,
    markerEnd: "url(#arrow)"
  });

  return path;
}

function getData(points) {
  const segments = getSegments(points);

  if (segments.length === 1) {
    return getSingleSegmentData(segments[0]);
  }

  const startSegment = segments.shift();

  return [
    moveTo(startSegment.start),
    quadraticCurve(startSegment.controlPoint, startSegment.end),
    ...segments.map(segment => sameCurve(segment.controlPoint, segment.end))
  ].join(" ");
}

function moveTo(a) {
  return `M ${a.x} ${a.y}`;
}

function quadraticCurve(a, b) {
  return `Q ${a.x} ${a.y} ${b.x} ${b.y}`;
}

function sameCurve(a, b) {
  return `S ${a.x} ${a.y} ${b.x} ${b.y}`;
}

function getSegments(points) {
  if (points.length === 2) {
    return [
      {
        start: points[0],
        controlPoint: randomOffset(getMid(points[0], points[1])),
        end: points[1]
      }
    ];
  }

  if (points.length === 3) {
    return [
      {
        start: points[0],
        controlPoint: randomOffset(points[1]),
        end: points[2]
      }
    ];
  }

  // const offset = randomOffset();
  const offset = { x: 0, y: 0 };

  return [
    getStartSegment(points, offset),
    ...getMiddleSegments(points, offset),
    getEndSegment(points, offset)
  ];
}

function getStartSegment(points, offset = { x: 0, y: 0 }) {
  return {
    start: points[0],
    controlPoint: add(points[1], offset),
    end: getMid(points[1], points[2])
  };
}

function getMiddleSegments(points) {
  return [];
}

function getEndSegment(points, offset = { x: 0, y: 0 }) {
  return {
    start: getMid(points[points.length - 3], points[points.length - 2]),
    controlPoint: add(points[points.length - 2], offset),
    end: points[points.length - 1]
  };
}

function getSingleSegmentData(segment) {
  const { start, controlPoint, end } = segment;

  return [moveTo(start), quadraticCurve(controlPoint, end)].join(" ");
}

function getMid(a, b) {
  return {
    x: Math.round((a.x + b.x) / 2),
    y: Math.round((a.y + b.y) / 2)
  };
}

const OFFSET = 10;

const random = Math.round(Math.random() * 2 * OFFSET - OFFSET);

function randomOffset(value) {
  if (isObject(value)) {
    return {
      x: randomOffset(value.x),
      y: randomOffset(value.y)
    };
  }

  if (isUndefined(value)) {
    return {
      x: random,
      y: random
    };
  }

  return value + random;
}

function add(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y
  };
}
