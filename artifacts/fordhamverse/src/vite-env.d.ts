/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STDB_URI?: string;
  readonly VITE_STDB_MODULE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
