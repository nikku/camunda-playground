<script>
  import { onMount } from 'svelte';

  import Viewer from './viewer/Viewer';

  import { keys } from 'min-dash';

  export let diagram;

  export let instanceDetails;

  export let onShown;
  export let onLoading;

  let containerEl;

  let loadingDiagram;
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

  $: loadingDiagram ? onLoading() : onShown();

  $: diagram && checkReload(diagram);

  function checkReload(newDiagram) {

    const currentDiagram = loadingDiagram || shownDiagram;

    if (currentDiagram && currentDiagram.contents === newDiagram.contents) {
      shownDiagram = newDiagram;

      return;
    }

    loadingDiagram = newDiagram;

    viewer.clearProcessInstance();

    viewer.importXML(newDiagram.contents, (error, warnings) => {
      if (error) {
        return console.error(error);
      }

      shownDiagram = loadingDiagram;
      loadingDiagram = null;
    });
  };

  let lastDetails;

  function needsUpdate(oldDetails, newDetails) {
    if (!oldDetails || !oldDetails.trace) {
      return true;
    }

    if (keys(oldDetails.trace).length !== keys(newDetails.trace).length) {
      return true;
    }

    return false;
  }

  function updateInstance(details) {
    if (!needsUpdate(lastDetails, details)) {
      return;
    }

    lastDetails = details;

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