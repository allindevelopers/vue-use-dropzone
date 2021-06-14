import { InputHTMLAttributes } from "@vue/runtime-dom";
import {
  computed,
  ref,
  watch,
  WatchCallback,
  WatchOptionsBase,
} from "vue-demi";
import { FileWithPath, fromEvent } from "file-selector";
import {
  allFilesAccepted,
  composeEventHandlers,
  fileAccepted,
  fileMatchSize,
  isEvtWithFiles,
  isIeOrEdge,
  isPropagationStopped,
  noop,
  onDocumentDragOver,
  TOO_MANY_FILES_REJECTION,
} from "./utils";
import {
  DropzoneOptions,
  DropzoneState,
  FileError,
  FileRejection,
  FilesWithPathPromise,
  GetInputProps,
  GetRootProps,
  UnknownFunction,
} from "./types";

const defaultProps = {
  disabled: false,
  getFilesFromEvent: fromEvent,
  maxSize: Infinity,
  minSize: 0,
  multiple: true,
  maxFiles: 0,
  preventDropOnDocument: true,
  noClick: false,
  noKeyboard: false,
  noDrag: false,
  noDragEventsBubbling: false,
};

const postFlush: WatchOptionsBase = {
  flush: "post",
};

export function useDropzone(options: DropzoneOptions = {}): DropzoneState {
  const {
    accept,
    disabled,
    getFilesFromEvent,
    maxSize,
    minSize,
    multiple,
    maxFiles,
    onDragenter,
    onDragleave,
    onDragover,
    onDrop,
    onDropAccepted,
    onDropRejected,
    onFileDialogCancel,
    preventDropOnDocument,
    noClick,
    noKeyboard,
    noDrag,
    noDragEventsBubbling,
    validator,
  } = {
    ...defaultProps,
    ...options,
  };

  const rootRef = ref<HTMLElement>();
  const inputRef = ref<HTMLInputElement>();
  const isFocused = ref(false);
  const isFileDialogActive = ref(false);
  const isDragActive = ref(false);
  const draggedFiles = ref<FileWithPath[]>([]);
  const acceptedFiles = ref<FileWithPath[]>([]);
  const fileRejections = ref<FileRejection[]>([]);

  // Fn for opening the file dialog programmatically
  function openFileDialog() {
    if (inputRef.value) {
      isFileDialogActive.value = true;
      inputRef.value.value = null as unknown as string;
      inputRef.value.click();
    }
  }

  // Update file dialog active state when the window is focused on
  function onWindowFocus() {
    // Execute the timeout only if the file dialog is opened in the browser
    if (isFileDialogActive.value) {
      setTimeout(() => {
        if (inputRef.value) {
          const { files } = inputRef.value;

          if (!files?.length) {
            isFileDialogActive.value = false;
            if (typeof onFileDialogCancel === "function") {
              onFileDialogCancel();
            }
          }
        }
      }, 300);
    }
  }

  const focusEffect: WatchCallback = (_new, _old, onInvalidate) => {
    window.addEventListener("focus", onWindowFocus, false);
    onInvalidate(() => {
      window.removeEventListener("focus", onWindowFocus, false);
    });
  };

  watch(inputRef, focusEffect, postFlush);
  watch(isFileDialogActive, focusEffect, postFlush);
  watch(() => onFileDialogCancel, focusEffect, postFlush);

  // Cb to open the file dialog when SPACE/ENTER occurs on the dropzone
  function onKeydownCb(event: KeyboardEvent) {
    // Ignore keyboard events bubbling up the DOM tree
    if (!rootRef.value || !rootRef.value.isEqualNode(event.target as Node)) {
      return;
    }

    const passes = [
      event.code === "Space",
      event.code === "Enter",
      event.code === "NumpadEnter",
      // event.keyCode === 32,
      // event.keyCode === 13,
    ];

    if (passes.some(Boolean)) {
      event.preventDefault();
      openFileDialog();
    }
  }

  // Update focus state for the dropzone
  function onFocusCb() {
    isFocused.value = true;
  }

  function onBlurCb() {
    isFocused.value = false;
  }

  // Cb to open the file dialog when click occurs on the dropzone
  function onClickCb() {
    if (noClick) {
      return;
    }

    // In IE11/Edge the file-browser dialog is blocking, therefore, use setTimeout()
    // to ensure React can handle state changes
    // See: https://github.com/react-dropzone/react-dropzone/issues/450
    if (isIeOrEdge()) {
      setTimeout(openFileDialog, 0);
    } else {
      openFileDialog();
    }
  }

  const dragTargetsRef = ref<EventTarget[]>([]);

  function onDocumentDrop(event: DragEvent) {
    if (rootRef.value && rootRef.value.contains(event.target as Node)) {
      // If we intercepted an event for our instance, let it propagate down to the instance's onDrop handler
      return;
    }
    event.preventDefault();
    dragTargetsRef.value = [];
  }

  const dragoverAndDropEffect: WatchCallback = (_new, _old, onInvalidate) => {
    if (preventDropOnDocument) {
      document.addEventListener("dragover", onDocumentDragOver, false);
      document.addEventListener("drop", onDocumentDrop, false);
    }

    onInvalidate(() => {
      if (preventDropOnDocument) {
        document.removeEventListener("dragover", onDocumentDragOver);
        document.removeEventListener("drop", onDocumentDrop);
      }
    });
  };

  watch(rootRef, dragoverAndDropEffect, postFlush);
  watch(() => preventDropOnDocument, dragoverAndDropEffect, postFlush);

  function onDragenterCb(event: DragEvent) {
    event.preventDefault();
    stopPropagation(event);

    dragTargetsRef.value = [
      ...dragTargetsRef.value,
      event.target as EventTarget,
    ];

    if (isEvtWithFiles(event)) {
      const filesWithPathPromise = getFilesFromEvent(
        event
      ) as FilesWithPathPromise;
      Promise.resolve(filesWithPathPromise).then((_draggedFiles) => {
        if (isPropagationStopped(event) && !noDragEventsBubbling) {
          return;
        }

        draggedFiles.value = _draggedFiles;
        isDragActive.value = true;

        if (onDragenter) {
          onDragenter(event);
        }
      });
    }
  }

  function onDragoverCb(event: DragEvent) {
    event.preventDefault();
    stopPropagation(event);

    const hasFiles = isEvtWithFiles(event);
    if (hasFiles && event.dataTransfer) {
      try {
        event.dataTransfer.dropEffect = "copy";
      } catch {}
    }

    if (hasFiles && onDragover) {
      onDragover(event);
    }

    return false;
  }

  function onDragleaveCb(event: DragEvent) {
    event.preventDefault();
    stopPropagation(event);

    // Only deactivate once the dropzone and all children have been left
    const targets = dragTargetsRef.value.filter(
      (target) => rootRef.value && rootRef.value.contains(target as Node)
    );
    // Make sure to remove a target present multiple times only once
    // (Firefox may fire dragenter/dragleave multiple times on the same element)
    const targetIdx = targets.indexOf(event.target as EventTarget);
    if (targetIdx !== -1) {
      targets.splice(targetIdx, 1);
    }
    dragTargetsRef.value = targets;
    if (targets.length > 0) {
      return;
    }

    isDragActive.value = false;
    draggedFiles.value = [];

    if (isEvtWithFiles(event) && onDragleave) {
      onDragleave(event);
    }
  }

  function onDropCb(event: DragEvent) {
    event.preventDefault();
    stopPropagation(event);

    dragTargetsRef.value = [];

    if (isEvtWithFiles(event)) {
      const filesWithPathPromise = getFilesFromEvent(
        event
      ) as FilesWithPathPromise;

      Promise.resolve(filesWithPathPromise).then((files) => {
        if (isPropagationStopped(event) && !noDragEventsBubbling) {
          return;
        }

        const _acceptedFiles: FileWithPath[] = [];
        const _fileRejections: FileRejection[] = [];

        files.forEach((file) => {
          const [accepted, acceptError] = fileAccepted(file, accept);
          const [sizeMatch, sizeError] = fileMatchSize(file, minSize, maxSize);
          const customErrors = validator ? validator(file) : null;

          if (accepted && sizeMatch && !customErrors) {
            _acceptedFiles.push(file);
          } else {
            const isError = (e: unknown): e is FileError => Boolean(e);
            let errors: FileError[] = [acceptError, sizeError].filter(isError);

            if (customErrors) {
              errors = errors.concat(customErrors);
            }

            _fileRejections.push({ file, errors: errors });
          }
        });

        if (
          (!multiple && _acceptedFiles.length > 1) ||
          (multiple && maxFiles >= 1 && _acceptedFiles.length > maxFiles)
        ) {
          // Reject everything and empty accepted files
          _acceptedFiles.forEach((file) => {
            _fileRejections.push({ file, errors: [TOO_MANY_FILES_REJECTION] });
          });
          _acceptedFiles.splice(0);
        }

        acceptedFiles.value = _acceptedFiles;
        fileRejections.value = _fileRejections;

        if (onDrop) {
          onDrop(_acceptedFiles, _fileRejections, event);
        }

        if (_fileRejections.length > 0 && onDropRejected) {
          onDropRejected(_fileRejections, event);
        }

        if (_acceptedFiles.length > 0 && onDropAccepted) {
          onDropAccepted(_acceptedFiles, event);
        }
      });
    }
    isFileDialogActive.value = false;
    isDragActive.value = false;
    draggedFiles.value = [];
    acceptedFiles.value = [];
    fileRejections.value = [];
  }

  function composeHandler(fn: UnknownFunction) {
    return disabled ? noop : fn;
  }

  function composeKeyboardHandler(fn: UnknownFunction) {
    return noKeyboard ? noop : composeHandler(fn);
  }

  function composeDragHandler(fn: UnknownFunction) {
    return noDrag ? noop : composeHandler(fn);
  }

  function stopPropagation(event: Event) {
    if (noDragEventsBubbling) {
      event.stopPropagation();
    }
  }

  const getRootProps: GetRootProps = ({
    refKey = "ref",
    onKeydown,
    onFocus,
    onBlur,
    onClick,
    onDragenter,
    onDragover,
    onDragleave,
    onDrop,
    ...rest
  } = {}) => ({
    onKeydown: composeKeyboardHandler(
      composeEventHandlers(onKeydown, onKeydownCb)
    ),
    onFocus: composeKeyboardHandler(composeEventHandlers(onFocus, onFocusCb)),
    onBlur: composeKeyboardHandler(composeEventHandlers(onBlur, onBlurCb)),
    onClick: composeHandler(composeEventHandlers(onClick, onClickCb)),
    onDragenter: composeDragHandler(
      composeEventHandlers(onDragenter, onDragenterCb)
    ),
    onDragover: composeDragHandler(
      composeEventHandlers(onDragover, onDragoverCb)
    ),
    onDragleave: composeDragHandler(
      composeEventHandlers(onDragleave, onDragleaveCb)
    ),
    onDrop: composeDragHandler(composeEventHandlers(onDrop, onDropCb)),
    [refKey]: rootRef,
    ...(!disabled && !noKeyboard ? { tabIndex: 0 } : {}),
    ...rest,
  });

  function onInputElementClick(event: MouseEvent) {
    event.stopPropagation();
  }

  const getInputProps: GetInputProps = ({
    refKey = "ref",
    onInput,
    onClick,
    ...rest
  } = {}) => {
    const inputProps: InputHTMLAttributes = {
      accept,
      multiple,
      type: "file",
      style: { display: "none" },
      onInput: composeHandler(composeEventHandlers(onInput, onDropCb)),
      onClick: composeHandler(
        composeEventHandlers(onClick, onInputElementClick)
      ),
      autocomplete: "off",
      tabindex: -1,
      [refKey]: inputRef,
    };

    return {
      ...inputProps,
      ...rest,
    };
  };

  const isDragAccept = computed(() => {
    return (
      draggedFiles.value.length > 0 &&
      allFilesAccepted({
        files: draggedFiles.value,
        accept,
        minSize,
        maxSize,
        multiple,
        maxFiles,
      })
    );
  });

  const isDragReject = computed(
    () => draggedFiles.value.length > 0 && !isDragAccept.value
  );

  return {
    isDragAccept,
    isDragReject,
    isFocused: computed(() => isFocused.value && !disabled),
    isFileDialogActive,
    isDragActive,
    acceptedFiles,
    draggedFiles,
    fileRejections,
    getRootProps,
    getInputProps,
    rootRef,
    inputRef,
    open: composeHandler(openFileDialog),
  };
}
