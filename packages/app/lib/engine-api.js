const FormData = require('form-data');

const fetch = require('node-fetch');
const path = require('path');


function EngineApi(camundaBaseUrl) {

  const baseUrl = `${camundaBaseUrl}/engine-rest`;


  async function deployDiagram(diagram) {

    const form = new FormData();

    form.append('deployment-name', 'camunda-playground-deployment');
    form.append('deployment-source', 'camunda-playground');

    const diagramName = path.basename(diagram.path);

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
    }).then(res => res.json());

    const {
      id,
      deployedProcessDefinitions
    } = response;

    return {
      id,
      deployedProcessDefinitions,
      deployedProcessDefinition: Object.values(deployedProcessDefinitions)[0]
    };
  }

  async function startProcessInstance(definition) {

    return await fetch(`${baseUrl}/process-definition/${definition.id}/start`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({})
    }).then(res => res.json());
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