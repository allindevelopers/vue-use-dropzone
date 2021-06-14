<template>
  {{ test }}
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {useDropzone} from "../lib";

export default defineComponent({
  setup(props, context) {
    const dropzone = useDropzone({})
    console.log(dropzone)



    return {
          test: '123'
    }
  }
})
</script>
