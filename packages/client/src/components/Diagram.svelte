<script>
  import { onMount } from 'svelte';

  import Viewer from './viewer/Viewer';

  import { keys } from 'min-dash';

  import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json';

  export let diagram;

  export let instanceDetails;

  export let onShown;
  export let onLoading;

  let containerEl;

  let loadingDiagram;
  let shownDiagram;

  const viewer = new Viewer({
    moddleExtensions: {
      camunda: camundaModdle
    }
  });

  onMount(() => {
    viewer.attachTo(containerEl);
  });

  $: {
    if (shownDiagram && instanceDetails && shownDiagram.hash === instanceDetails.diagramHash) {
      updateInstance(instanceDetails);
    } else {
      clearInstance();
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

  let lastDetails = null;

  function clearInstance() {
    lastDetails = null;

    viewer.clearProcessInstance();
  }

  function updateInstance(details) {
    if (lastDetails && JSON.stringify(lastDetails) === JSON.stringify(details)) {
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