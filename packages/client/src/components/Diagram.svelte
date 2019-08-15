<script>
  import { onMount, afterUpdate } from 'svelte';

  import Viewer from './viewer/Viewer';

  export let xml;

  export let instanceDetails;

  export let onImportDone;

  const viewer = new Viewer({});

  $: {
    updateInstance(instanceDetails);
  };

  function updateInstance(details) {

    viewer.clearProcessInstance();

    if (lastXML) {
      viewer.showProcessInstance(details);
    }
  }

  let lastXML = null;

  let container;

  onMount(() => {
    viewer.attachTo(container);
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