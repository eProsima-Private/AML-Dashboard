<script>
  import { ViewContainer } from '@marcellejs/design-system';
  export let title;
  export let url;  // Accept the URL prop
</script>

<ViewContainer {title}>

  <iframe title="" src={url}  width="(parseInt(window.innerWidth) * 0.9)" height="750px" style="border: none;"></iframe>
  
</ViewContainer>