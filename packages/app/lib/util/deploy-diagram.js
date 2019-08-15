const path = require('path');

const FormData = require('form-data');

const got = require('got');

const {
  defaultOptions
} = require('./rest-api');


async function deployDiagram(diagram) {

  const form = new FormData();

  form.append('deployment-name', 'camunda-playground-deployment');
  form.append('deployment-source', 'camunda-playground');

  const diagramName = path.basename(diagram.path);

  form.append(diagramName, diagram.contents, {
    filename: diagramName,
    contentType: 'application/xml'
  });

  const response = await got.post('/deployment/create', {
    headers: {
      'accept': 'application/json'
    },
    ...defaultOptions,
    body: form
  });

  const {
    id,
    deployedProcessDefinitions
  } = JSON.parse(response.body);

  return {
    id,
    deployedProcessDefinitions,
    deployedProcessDefinition: Object.values(deployedProcessDefinitions)[0]
  };
}

module.exports = deployDiagram;