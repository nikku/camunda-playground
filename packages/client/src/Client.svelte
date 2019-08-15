<script>
  import Diagram from './components/Diagram.svelte';
  import FileDrop from './components/FileDrop.svelte';
  import Loader from './components/Loader.svelte';

  let diagram = null;

  let instanceDetails = null;

  let loaderVisible = true;

  $: definitionId = instanceDetails && instanceDetails.definitionId;

  $: diagramLoading = definitionId && fetchDiagram(definitionId).then(_diagram => diagram = _diagram);

  async function fetchDiagram(definitionId) {
    const response = await fetch('/api/diagram');

    const diagram = await response.json();

    return {
      ...diagram,
      definitionId
    };
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
    } else {
      error = response;
    }
  }

  function handleDiagramShown() {
    loaderVisible = false;
  }

  setInterval(getProcessInstanceDetails, 1000);
</script>

<style>
  .diagram-name {
    background: #FFF;
    border-radius: 2px;
    border: solid 1px #E0E0E0;
    padding: 6px 12px;
    color: #444;
    font: 14px monospace;
    left: 20px;
    position: absolute;
    text-decoration: none;
    top: 20px;
  }

  .diagram-name:hover {
    background: #E0E0E0;
  }
</style>

<Loader visible={ loaderVisible }></Loader>

<FileDrop onFileDrop={ uploadDiagram }>
  <Diagram
    diagram={ diagram }
    instanceDetails={ instanceDetails }
    onShown={ () => loaderVisible = false }
    onLoading={ () => loaderVisible = true }
  />
</FileDrop>

{#if diagram}

  {#if diagram.path}
    <a class="diagram-name" href="#" title="Open externally" on:click={ handleOpen }><i class="fas fa-external-link-alt"></i> { diagram.path }</a>
  {:else}
    <div class="diagram-name">{ diagram.name }</div>
  {/if}
{/if}