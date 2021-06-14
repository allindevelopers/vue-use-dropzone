<template>
  <Dropzone
    v-slot="{ acceptedFiles, getRootProps, getInputProps, isDragActive, open }"
  >
    <section>
      <div
        v-bind="getRootProps()"
        class="
          m-4
          p-24
          flex
          items-center
          justify-center
          border-dashed border-2 border-gray-500
        "
        :class="isDragActive ? 'bg-red-500' : 'bg-gray-100'"
      >
        <input v-bind="getInputProps()" />
        <p>Drag 'n' drop some files here, or click to select files</p>
      </div>
      <aside class="m-4">
        <button class="mb-2 p-3 bg-gray-200" @click="open">Select files</button>
        <h4>Files</h4>
        <ul>
          <li v-for="file in acceptedFiles" :key="file.path">
            {{ file.path }} - {{ file.size }} bytes
          </li>
        </ul>
      </aside>
    </section>
  </Dropzone>
</template>

<script lang="ts">
import { Dropzone } from "./Dropzone";
import { defineComponent } from "vue-demi";

export default defineComponent({
  components: { Dropzone },
});
</script>
