const FormData = require('form-data');

const fetch = require('node-fetch');
const path = require('path');


function EngineApi(camundaBaseUrl) {

  const baseUrl = `${camundaBaseUrl}/engine-rest`;


  async function deployDiagram(diagram) {

    const form = new FormData();

    form.append('deployment-name', 'camunda-playground-deployment');
    form.append('deployment-source', 'camunda-playground');

    const diagramName = diagram.path && path.basename(diagram.path) || diagram.name;

    form.append(diagramName, diagram.contents, {
      filename: diagramName,
      contentType: 'application/xml'
    });

    const response = await fetch(`${baseUrl}/deployment/create`, {
      method: 'POST',
      headers: {
        'accept': 'application/json'
      },
      body: form
    });

    if (response.ok) {

      const {
        id,
        deployedProcessDefinitions
      } = await response.json();

      return {
        id,
        deployedProcessDefinitions,
        deployedProcessDefinition: Object.values(deployedProcessDefinitions || {})[0]
      };
    }

    const details = await response.json();

    throw responseError('Deployment failed', response, details);
  }

  async function startProcessInstance(definition) {

    const response = await fetch(`${baseUrl}/process-definition/${definition.id}/start`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (response.ok) {
      return response.json();
    }

    const details = await response.json();

    throw responseError('Starting process instance failed', response, details);
  }

  async function getProcessInstanceDetails(processInstance) {

    const {
      id
    } = processInstance;

    const [
      state,
      activityInstances
    ] = await Promise.all([
      // https://docs.camunda.org/manual/7.11/reference/rest/history/process-instance/get-process-instance/
      fetch(`${baseUrl}/history/process-instance/${id}`, {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      }),

      // https://docs.camunda.org/manual/7.11/reference/rest/history/activity-instance/get-activity-instance-query/
      fetch(`${baseUrl}/history/activity-instance?processInstanceId=${id}`, {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      })
    ].map(result => result.then(res => res.json())));

    return {
      id,
      state,
      activityInstances
    };
  }

  // api /////////////////

  this.deployDiagram = deployDiagram;
  this.getProcessInstanceDetails = getProcessInstanceDetails;
  this.startProcessInstance = startProcessInstance;

}


module.exports = EngineApi;


// helpers //////////////

const parseError = 'ENGINE-09005 Could not parse BPMN process. Errors: \n*';

function responseError(message, response, details) {
  const error = new Error(message);

  error.details = details;
  error.response = response;

  // fix engine not exposing details
  if (details && details.message.startsWith(parseError)) {
    details.problems = details.message.substring(parseError.length).split(/\s?\n\*\s?/g);
    details.message = 'ENGINE-09005 Could not parse BPMN process';
  }

  return error;
}