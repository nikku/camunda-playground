<script>
  import Diagram from './components/Diagram.svelte';
  import FileDrop from './components/FileDrop.svelte';
  import Loader from './components/Loader.svelte';

  let name, xml;

  let loaderVisible = true;

  const getDiagram = async url => {
    const response = await fetch(url);

    const json = await response.json();

    setDiagram(json);
  }

  const putDiagram = async diagram => {
    const { contents, name } = diagram;

    if (contents === xml) {
      return;
    }

    loaderVisible = true;

    setDiagram({
      contents,
      path: name
    });

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

  const setDiagram = ({ contents, path }) => {
    if (contents) {
      xml = contents;
      name = path;
    };
  }

  getDiagram('/api/diagram');
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
  <Diagram xml={ xml } onImportDone={ () => loaderVisible = false } />
</FileDrop>

<div class="diagram-name">{ name }</div>