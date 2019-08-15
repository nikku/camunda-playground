<script>
  export let visible;

  $: classNames = visible ? 'loader visible' : 'loader';
</script>

<style>
  .loader {
    align-items: center;
    background-color: white;
    display: flex;
    height: 100%;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    position: relative;
    z-index: 1000;
  }

  .loader.visible {
    opacity: 1;
  }
</style>

<div class={ classNames }>
  <img src="animated-logo-grey-48.gif" />
</div>