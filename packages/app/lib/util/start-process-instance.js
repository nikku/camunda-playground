const got = require('got');

const {
  defaultOptions
} = require('./rest-api');


async function startProcessInstance(definition) {

  const response = await got.post(`/process-definition/${definition.id}/start`, {
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    ...defaultOptions,
    body: JSON.stringify({})
  });

  return JSON.parse(response.body);
}

module.exports = startProcessInstance;