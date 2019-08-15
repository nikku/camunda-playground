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

  getDiagram('/api/diagram');

  const getProcessInstance = async () => {
    const response = await fetch('/api/process-instance');

    processInstance = await response.json();
  }

  setInterval(getProcessInstance, 3000);
</script>

<style>
  .diagram-name {
    font-family: 'Arial', sans-serif;
    left: 20px;
    position: absolute;
    top: 20px;
  }
</style>

<Loader visible={ loaderVisible }></Loader>

<FileDrop onFileDrop={ putDiagram }>
  <Diagram
    xml={ diagram && diagram.contents }
    processInstance={ processInstance }
    onImportDone={ () => loaderVisible = false } />
</FileDrop>

<div class="diagram-name" title={ diagram && diagram.path }>{ diagram && diagram.name }</div>