const got = require('got');

const {
  defaultOptions
} = require('./rest-api');


async function getProcessInstanceState(processInstance) {

  const {
    id
  } = processInstance;

  // https://docs.camunda.org/manual/7.11/reference/rest/history/process-instance/get-process-instance/

  const stateResponse = await got.get(`/history/process-instance/${id}`, {
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    ...defaultOptions
  });

  const state = JSON.parse(stateResponse.body);

  // https://docs.camunda.org/manual/7.11/reference/rest/history/activity-instance/get-activity-instance-query/

  const activityInstancesResponse = await got.get(`/history/activity-instance?processInstanceId=${id}`, {
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    ...defaultOptions
  });

  const activityInstances = JSON.parse(activityInstancesResponse.body);

  return {
    id,
    state,
    activityInstances
  };
}

module.exports = getProcessInstanceState;