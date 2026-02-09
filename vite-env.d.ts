/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_PDF_TO_IMAGE_URL?: string;
  readonly VITE_EXCEL_PARSE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
