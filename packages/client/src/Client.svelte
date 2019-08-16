<script>
  import Diagram from './components/Diagram.svelte';
  import FileDrop from './components/FileDrop.svelte';
  import Loader from './components/Loader.svelte';

  let diagram = null;

  let instanceDetails = null;

  let runError = null;

  let diagramLoading = true;

  $: loaderVisible = diagramLoading && !runError;

  $: definitionId = instanceDetails && instanceDetails.definitionId;

  $: loadingDiagram = fetchDiagram(definitionId).then(_diagram => {
    diagram = _diagram;
  });

  async function fetchDiagram(definitionId) {
    const response = await fetch('/api/diagram');

    if (response.ok) {
      const diagram = await response.json();

      return {
        ...diagram,
        definitionId
      };
    }

    return null;
  }

  const uploadDiagram = async file => {
    const { contents, name } = file;

    if (diagram && contents === diagram.contents) {
      return;
    }

    loaderVisible = true;

    diagram = {
      contents,
      name
    };

    const response = await fetch('/api/diagram', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(diagram)
    });

    const json = await response.json();

    console.log(json);
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
    loaderVisible = true;

    const response = await fetch('/api/process-instance/start', {
      method: 'POST'
    });

    const json = await response.json();

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

  .run-error {
    z-index: 1;
    position: absolute;
    top: 30%;
    left: 50%;
    transform: translate(-50%);
    width: 80%;
    background: rgba(255, 166, 166, 0.8);
    padding: 15px 30px;

    pre {
      white-space: pre-wrap;
    }
  }

  .start-new-instance {
    @include button(#0073e6);

    position: absolute;
    right: 20px;
    top: 20px;
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

  <div class="run-error">
    <h4>{runError.message}</h4>

    {#if runError.details}
      <pre>{JSON.stringify(runError.details, null, '  ') }</pre>
    {/if}
  </div>

{/if}

{#if diagram}

  {#if diagram.path}
    <a class="diagram-name" href="#" title="Open externally" on:click={ handleOpen }>
      <svg width="1.2em" height="1.2em" style="vertical-align: text-bottom" viewBox="0 0 12 16" fill="currentColor" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"></path></svg> { diagram.path }
    </a>
  {:else}
    <div class="diagram-name">{ diagram.name }</div>
  {/if}

{/if}

<button class:running={ instanceDetails && instanceDetails.state === 'running' } class:completed={instanceDetails && instanceDetails.state !== 'running' } class="start-new-instance" on:click={ handleRestart }><svg height="1.2em" viewBox="0 0 12 16" version="1.1" width="1.2em" style="vertical-align: text-bottom" aria-hidden="true" fill="currentColor"><path fill-rule="evenodd" d="M10.24 7.4a4.15 4.15 0 0 1-1.2 3.6 4.346 4.346 0 0 1-5.41.54L4.8 10.4.5 9.8l.6 4.2 1.31-1.26c2.36 1.74 5.7 1.57 7.84-.54a5.876 5.876 0 0 0 1.74-4.46l-1.75-.34zM2.96 5a4.346 4.346 0 0 1 5.41-.54L7.2 5.6l4.3.6-.6-4.2-1.31 1.26c-2.36-1.74-5.7-1.57-7.85.54C.5 5.03-.06 6.65.01 8.26l1.75.35A4.17 4.17 0 0 1 2.96 5z"></path></svg> Restart</button>