<script>
  import { onMount } from 'svelte';

  import Viewer from './viewer/Viewer';

  export let diagram;

  export let instanceDetails;

  export let onShown;
  export let onLoading;

  let containerEl;

  let shownDiagram;

  const viewer = new Viewer();

  onMount(() => {
    viewer.attachTo(containerEl);
  });

  $: {
    if (shownDiagram && instanceDetails && shownDiagram.definitionId === instanceDetails.definitionId) {
      updateInstance(instanceDetails);
    }
  };

  $: {
    if (diagram) {
      const diagramLoading = diagram;

      viewer.clearProcessInstance();

      onLoading();

      viewer.importXML(diagram.contents, (error, warnings) => {
        if (error) {
          return console.error(error);
        }

        shownDiagram = diagramLoading;

        // TODO: remove
        setTimeout(onShown, 500);
      });
    }
  };

  function updateInstance(details) {

    viewer.clearProcessInstance();

    viewer.showProcessInstance(details);
  }
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

<div bind:this={containerEl}></div>