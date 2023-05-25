import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';

export function getExternalTaskTopic(activity) {
  const bo = getBusinessObject(activity);

  return bo.get('camunda:topic');
}