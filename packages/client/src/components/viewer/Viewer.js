import NavigatedViewer from 'bpmn-js/dist/bpmn-navigated-viewer.development.js';

import FitViewport from './features/FitViewport';
import ProcessInstance from './features/ProcessInstance';

const additionalModules = [
  {
    __init__: [ 'fitViewport', 'processInstance' ],
    fitViewport: [ 'type', FitViewport ],
    processInstance: [ 'type', ProcessInstance ]
  }
];

class Viewer extends NavigatedViewer {
  constructor(options) {
    super(Object.assign(options, {
      additionalModules
    }));
  }

  showProcessInstance(processInstance) {
    this.get('processInstance').show(processInstance);
  }

  clearProcessInstance() {
    this.get('processInstance').clear();
  }
}

export default Viewer;