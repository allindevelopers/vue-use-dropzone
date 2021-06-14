<template>
  <HookExample />
  <ComponentExample />
</template>

<script lang="ts">
import { defineComponent } from "vue-demi";
import ComponentExample from "./ComponentExample.vue";
import HookExample from "./HookExample.vue";

export default defineComponent({
  components: { HookExample, ComponentExample },
});
</script>
