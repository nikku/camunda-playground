<script>
  import { onMount } from 'svelte';

  import Viewer from 'bpmn-js/dist/bpmn-viewer.development.js';

  let diagramUrl = 'https://cdn.rawgit.com/bpmn-io/bpmn-js-examples/dfceecba/starter/diagram.bpmn';

  let container;

  onMount(() => {
    const viewer = new Viewer({
      container
    });

    fetch(diagramUrl)
      .then(response => response.text())
      .then(diagramXML => {
        viewer.importXML(diagramXML, (error, warnings) => {
          if (error) {
            console.error(error);
          }
        });
      });
  });
</script>

<div bind:this={container} id="container"></div>