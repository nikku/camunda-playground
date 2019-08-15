<script>
  import { onMount, afterUpdate } from 'svelte';
  
  import Viewer from './viewer/Viewer';

  export let xml;

  export let processInstance;

  export let onImportDone;

  let lastXML = null;

  let container, viewer;

  onMount(() => {
    viewer = new Viewer({
      container
    });
  });

  afterUpdate(() => {
    if (!lastXML || lastXML !== xml) {
      viewer.clearProcessInstance();

      viewer.importXML(xml, (error, warnings) => {
        if (error) {
          console.error(error);
        }

        lastXML = xml;

        // TODO: remove
        setTimeout(onImportDone, 500);
      });
    }

    if (processInstance) {
      viewer.clearProcessInstance();

      viewer.showProcessInstance(processInstance);
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