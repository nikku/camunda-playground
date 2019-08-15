<script>
  import Diagram from './components/Diagram.svelte';
  import FileDrop from './components/FileDrop.svelte';
  import Loader from './components/Loader.svelte';

  let diagram = null;

  let processInstance = null;

  let loaderVisible = true;

  const getDiagram = async url => {
    const response = await fetch(url);

    const json = await response.json();

    diagram = json;
  }

  const putDiagram = async file => {
    const { contents, name } = file;

    if (diagram && contents === diagram.contents) {
      return;
    }

    loaderVisible = true;

    diagram = {
      contents,
      name: name,
      path: name
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

  async function getProcessInstance() {
    const response = await fetch('/api/process-instance');

    processInstance = await response.json();
  }

  getDiagram('/api/diagram');

  setInterval(getProcessInstance, 3000);
</script>

<style>
  .diagram-name {
    font: 13px monospace;
    left: 20px;
    position: absolute;
    top: 20px;

    text-decoration: none;
  }
</style>

<Loader visible={ loaderVisible }></Loader>

<FileDrop onFileDrop={ putDiagram }>
  <Diagram
    xml={ diagram && diagram.contents }
    processInstance={ processInstance }
    onImportDone={ () => loaderVisible = false } />
</FileDrop>

{#if diagram}

  {#if diagram.path}
    <a class="diagram-name" href="#" title="Open externally" on:click={ handleOpen }>{ diagram.path }</a>
  {:else}
    <div class="diagram-name">{ diagram.name }</div>
  {/if}
{/if}