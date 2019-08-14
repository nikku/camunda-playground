<script>
  import { onMount } from 'svelte';

  import fileDrop from 'file-drops';

  export let onFileDrop;

  const dropHandler = fileDrop('Drop a file', function(files) {
    // files = [ { name, contents }, ... ]

    if (files.length) {
      let file = files.shift();

      onFileDrop(file);
    }
  });

  let element;

  onMount(() => {
    element.addEventListener('dragover', dropHandler);
  });
</script>

<style>
  .file-drop {
    height: 100%;
    margin: 0;
    overflow: hidden;
    padding: 0;
  }

  :global(.file-drop) .drop-overlay {
    align-items: center;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    justify-content: center;
    height: 100%;
    pointer-events: none;
    position: relative;
    z-index: 1000;
  }

  :global(.file-drop) .drop-overlay .box {
    
  }
</style>

<div
  class="file-drop"
  bind:this={element}>
  <slot></slot>
</div>