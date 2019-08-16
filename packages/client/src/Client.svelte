<script>
  import Diagram from './components/Diagram.svelte';
  import FileDrop from './components/FileDrop.svelte';
  import Loader from './components/Loader.svelte';

  let diagram = null;

  let instanceDetails = null;

  let runError = null;

  let diagramLoading = true;

  $: loaderVisible = diagramLoading && !runError;

  $: loadingDiagram = checkDiagram(instanceDetails);

  $: waitStates = instanceDetails ? Object.values(instanceDetails.trace).filter(entry => !entry.endTime) : [];

  async function checkDiagram(instanceDetails) {

    const currentHash = (diagram || {}).hash;

    const newHash = (instanceDetails || {}).diagramHash;

    if (!newHash || currentHash !== newHash) {
      return fetchDiagram().then(_diagram => diagram = _diagram);
    } else {
      return diagram;
    }
  }

  async function fetchDiagram() {
    const response = await fetch('/api/diagram');

    if (response.ok) {
      return await response.json();
    } else {
      throw response;
    }
  }

  const uploadDiagram = async file => {
    const { contents, name } = file;

    if (diagram && contents === diagram.contents) {
      return;
    }

    loaderVisible = true;

    const newDiagram = {
      contents,
      name
    };

    const response = await fetch('/api/diagram', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newDiagram)
    });

    if (response.ok) {
      diagram = await response.json();
      instanceDetails = null;

      loadingDiagram = Promise.resolve(diagram);
    }
  }

  async function handleOpen(event) {
    event.preventDefault();

    await fetch('/api/diagram/open-external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async function getProcessInstanceDetails() {
    const response = await fetch('/api/process-instance');

    if (response.ok) {
      instanceDetails = await response.json();

      runError = null;
    } else {
      runError = await response.json();
    }
  }

  function handleDiagramShown() {
    loaderVisible = false;
  }

  setInterval(getProcessInstanceDetails, 1000);

  async function handleRestart() {
    instanceDetails = null;

    loaderVisible = true;

    const response = await fetch('/api/process-instance/start', {
      method: 'POST'
    });

    await response.json();

    instanceDetails = null;
    runError = null;

    setTimeout(() => {
      getProcessInstanceDetails();

      loaderVisible = false;
    }, 500);
  }
</script>

<style lang="scss">

  @import "shared.scss";

  .diagram-name {
    @include button(#E0E0E0, false);

    position: absolute;
    left: 20px;
    top: 20px;
  }

  .notice {
    z-index: 1;
    position: absolute;
    top: 30%;
    left: 50%;
    transform: translate(-50%);
    border-radius: 3px;
    width: 80%;
    padding: 15px 30px;

    font: 13px monospace;

    pre {
      white-space: pre-wrap;
      background: rgba(255, 255, 255, 0.6);
      padding: 7px 10px;

      border-left: solid 3px rgba(0,0,0,.6);
      border-radius: 2px;
    }
  }

  .run-error {
    background: rgb(255, 183, 183);
  }

  .no-diagram-notice {
    background: rgb(254, 244, 219);
  }

  .icon-loading {
    animation: jump 1s infinite;
    animation-timing-function: ease;
  }

  .run-error,
  .run-details {
    font: 13px monospace;
  }

  .run-details {
    position: absolute;
    right: 20px;
    top: 20px;
    width: 300px;

    padding: 7px 10px;
    padding-left: 60px;
    background: #FEFEFE;
    border:  solid 1px #CCC;
    border-radius: 3px;

    .header {
      margin: 10px 0 10px 0;
    }

    .wait-states ul {
      margin: 0;
      padding-left: 25px;
    }

    .footer {
      border: none;
      border-top: dotted 1px #CCC;
      margin: 15px 0;
      padding-top: 15px;
    }

    .status-icon {
      float: left;
      margin: 5px;
      margin-left: -45px;
    }
  }

  .start-new-instance {
    @include button(#0073e6);
  }

  .start-new-instance.completed {
    @include button(#49a013);
  }
</style>

<Loader visible={ loaderVisible }></Loader>

<FileDrop onFileDrop={ uploadDiagram }>
  <Diagram
    diagram={ diagram }
    instanceDetails={ instanceDetails }
    onShown={ () => diagramLoading = false }
    onLoading={ () => diagramLoading = true }
  />
</FileDrop>

{#if runError}

  <div class="notice run-error">
    <h4>Failed to run: {runError.message}</h4>

    {#if runError.details}
      <pre>{JSON.stringify(runError.details, null, '  ') }</pre>
    {/if}
  </div>

{/if}

{#if diagram}

  {#if diagram.path}
    <a class="diagram-name" href="#" title="Open externally" on:click={ handleOpen }>
      <svg width="1.2em" height="1.2em" class="icon" viewBox="0 0 12 16" fill="currentColor" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"></path></svg> { diagram.path }
    </a>
  {:else}
    <div class="diagram-name">Uploaded: { diagram.name }</div>
  {/if}

{/if}

{#if diagram}

  <div class="run-details">

    {#if runError}
      <svg height="3em" viewBox="0 0 14 16" class="icon status-icon icon-error" version="1.1" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 1H4L0 5v6l4 4h6l4-4V5l-4-4zm3 9.5L9.5 14h-5L1 10.5v-5L4.5 2h5L13 5.5v5zM6 4h2v5H6V4zm0 6h2v2H6v-2z"></path></svg>
    {:else if !instanceDetails}
      <svg height="3em" class="icon status-icon icon-loading" viewBox="0 0 12 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M10.24 7.4a4.15 4.15 0 0 1-1.2 3.6 4.346 4.346 0 0 1-5.41.54L4.8 10.4.5 9.8l.6 4.2 1.31-1.26c2.36 1.74 5.7 1.57 7.84-.54a5.876 5.876 0 0 0 1.74-4.46l-1.75-.34zM2.96 5a4.346 4.346 0 0 1 5.41-.54L7.2 5.6l4.3.6-.6-4.2-1.31 1.26c-2.36-1.74-5.7-1.57-7.85.54C.5 5.03-.06 6.65.01 8.26l1.75.35A4.17 4.17 0 0 1 2.96 5z"></path></svg>
    {:else if instanceDetails.state === 'running'}
      <svg height="3em" class="icon status-icon icon-running" viewBox="0 0 14 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm1 3H6v5h2V4zm0 6H6v2h2v-2z"></path></svg>
    {:else}
      <svg height="3em" class="icon status-icon icon-completed" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M7 10h2v2H7v-2zm2-6H7v5h2V4zm1.5 1.5l-1 1L12 9l4-4.5-1-1L12 7l-1.5-1.5zM8 13.7A5.71 5.71 0 0 1 2.3 8c0-3.14 2.56-5.7 5.7-5.7 1.83 0 3.45.88 4.5 2.2l.92-.92A6.947 6.947 0 0 0 8 1C4.14 1 1 4.14 1 8s3.14 7 7 7 7-3.14 7-7l-1.52 1.52c-.66 2.41-2.86 4.19-5.48 4.19v-.01z"></path></svg>
    {/if}

    <h4 class="header">

      {#if runError}
        Failed to run
      {:else if !instanceDetails}
        Loading instance details
      {:else if instanceDetails.state === 'running'}
        Instance running
      {:else}
        Instance finished
      {/if}
    </h4>

    {#if runError}
      <div class="error-message">{ runError.message}</div>
    {/if}

    {#if waitStates.length}
      <div class="wait-states">
        <h4>Waiting for...</h4>

        <ul>
          {#each waitStates as waitState}
            <li>
              {#if waitState.activityType === 'parallelGateway'}
                Join in <em>{waitState.activityId}</em>
              {:else if waitState.activityType === 'userTask'}
                User task completion in <em>{waitState.activityId}</em>
              {:else if waitState.activityType === 'serviceTask'}
                Service task completion in <em>{waitState.activityId}</em>
              {:else if waitState.activityType === 'receiveTask'}
                Incoming message in <em>{waitState.activityId}</em>
              {:else}
                { JSON.stringify(waitState) }
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if instanceDetails || runError}
      <div class="footer">

        <button class:running={ instanceDetails && instanceDetails.state === 'running' } class:completed={instanceDetails && instanceDetails.state !== 'running' } class="start-new-instance" on:click={ handleRestart }><svg height="1.2em" viewBox="0 0 12 16" version="1.1" width="1.2em" class="icon" aria-hidden="true" fill="currentColor"><path fill-rule="evenodd" d="M10.24 7.4a4.15 4.15 0 0 1-1.2 3.6 4.346 4.346 0 0 1-5.41.54L4.8 10.4.5 9.8l.6 4.2 1.31-1.26c2.36 1.74 5.7 1.57 7.84-.54a5.876 5.876 0 0 0 1.74-4.46l-1.75-.34zM2.96 5a4.346 4.346 0 0 1 5.41-.54L7.2 5.6l4.3.6-.6-4.2-1.31 1.26c-2.36-1.74-5.7-1.57-7.85.54C.5 5.03-.06 6.65.01 8.26l1.75.35A4.17 4.17 0 0 1 2.96 5z"></path></svg> Restart</button>

      </div>
    {/if}

  </div>
{/if}

{#await loadingDiagram}
{:then diagram}
{:catch error}
  <div class="notice no-diagram-notice">

    <h3>No Diagram Opened</h3>

    Drop a BPMN diagram here or pass your diagram via the command line:

    <pre>camunda-playground my-diagram.bpmn</pre>
  </div>
{/await}