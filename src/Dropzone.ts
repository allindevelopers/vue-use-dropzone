import { defineComponent, reactive } from "vue-demi";
import { useDropzone } from "../lib";

export const Dropzone = defineComponent({
  name: "Dropzone",
  setup(props, context) {
    const dropzone = reactive(useDropzone());
    return () => context.slots.default?.(dropzone);
  },
});
