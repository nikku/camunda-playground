<script>
  import { onMount, afterUpdate } from 'svelte';
  
  import Viewer from 'bpmn-js/dist/bpmn-navigated-viewer.development.js';

  export let xml;

  export let onImportDone;

  let container, viewer;

  onMount(() => {
    viewer = new Viewer({
      container
    });
  });

  afterUpdate(() => {
    if (xml) {
      viewer.importXML(xml, (error, warnings) => {
        if (error) {
          console.error(error);
        }

        // TODO: remove
        setTimeout(onImportDone, 500);
      });
    }
  });
</script>

<style>
  div {
    bottom: 0;
    height: 100%;
    left: 0;
    margin: 0;
    overflow: hidden;
    padding: 0;
    position: absolute;
    right: 0;
    top: 0;
  }
</style>

<div bind:this={container}></div>