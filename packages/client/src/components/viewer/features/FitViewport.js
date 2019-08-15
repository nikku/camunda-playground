export default class FitViewport {
  constructor(canvas, eventBus) {
    eventBus.on('import.done', () => {
      canvas.zoom('fit-viewport');
    });
  }
}

FitViewport.$inject = [
  'canvas',
  'eventBus'
];