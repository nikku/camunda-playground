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

      console.log('new instance started', json);

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
    <pre>{JSON.stringify(runError.details, null, '  ') }</pre>
  </div>

{/if}

{#if diagram}

  {#if diagram.path}
    <a class="diagram-name" href="#" title="Open externally" on:click={ handleOpen }><i class="fas fa-external-link-alt"></i> { diagram.path }</a>
  {:else}
    <div class="diagram-name">{ diagram.name }</div>
  {/if}

{/if}


{#if instanceDetails && instanceDetails.state === 'running'}
  <button class="start-new-instance running" on:click={ handleRestart }><i class="fas fa-redo"></i> Restart</button>
{:else}
  <button class="start-new-instance completed" on:click={ handleRestart }><i class="fas fa-redo"></i> Restart</button>
{/if}