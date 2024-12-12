<script>
  import { ViewContainer } from '@marcellejs/design-system';
  export let title;
  export let url;  // Accept the URL prop
</script>

<ViewContainer {title}>

  <iframe title="" src={url}  width="(parseInt(window.innerWidth) * 0.9)" height="100%" style="border:20px solid white; border-radius: 20px" ></iframe>
  
</ViewContainer>
