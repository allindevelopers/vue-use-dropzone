import { FileWithPath } from "file-selector";
import { HTMLAttributes, InputHTMLAttributes } from "@vue/runtime-dom";
import { Ref } from "vue-demi";

export interface FileError {
  message: string;
  code:
    | "file-too-large"
    | "file-too-small"
    | "too-many-files"
    | "file-invalid-type"
    | string;
}

export interface FileRejection {
  file: FileWithPath;
  errors: FileError[];
}

export type DropzoneOptions = Pick<InputHTMLAttributes, PropTypes> & {
  accept?: string;
  minSize?: number;
  maxSize?: number;
  maxFiles?: number;
  preventDropOnDocument?: boolean;
  noClick?: boolean;
  noKeyboard?: boolean;
  noDrag?: boolean;
  noDragEventsBubbling?: boolean;
  disabled?: boolean;
  onDrop?: <T extends File>(
    acceptedFiles: T[],
    fileRejections: FileRejection[],
    event: DropEvent
  ) => void;
  onDropAccepted?: <T extends File>(files: T[], event: DropEvent) => void;
  onDropRejected?: (fileRejections: FileRejection[], event: DropEvent) => void;
  getFilesFromEvent?: (
    event: DropEvent
  ) => Promise<Array<File | DataTransferItem>>;
  onFileDialogCancel?: () => void;
  validator?: <T extends File>(file: T) => FileError | FileError[] | null;
};

export type DropEvent = DragEvent | Event;

export type GetRootProps = (props?: DropzoneRootProps) => DropzoneRootProps;
export type GetInputProps = (props?: DropzoneInputProps) => DropzoneInputProps;

export type DropzoneState = {
  isFocused: Ref<boolean>;
  isDragActive: Ref<boolean>;
  isDragAccept: Ref<boolean>;
  isDragReject: Ref<boolean>;
  isFileDialogActive: Ref<boolean>;
  draggedFiles: Ref<FileWithPath[]>;
  acceptedFiles: Ref<FileWithPath[]>;
  fileRejections: Ref<FileRejection[]>;
  rootRef: Ref<HTMLElement | undefined>;
  inputRef: Ref<HTMLInputElement | undefined>;
  getRootProps: GetRootProps;
  getInputProps: GetInputProps;
  open: () => void;
};

export interface DropzoneRootProps extends HTMLAttributes {
  refKey?: string;
  [key: string]: any;
}

export interface DropzoneInputProps extends InputHTMLAttributes {
  refKey?: string;
}

type PropTypes = "multiple" | "onDragenter" | "onDragover" | "onDragleave";

export type FilesWithPathPromise = Promise<FileWithPath[]>;
export type UnknownFunction = (...args: unknown[]) => unknown;
