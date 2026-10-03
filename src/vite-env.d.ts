/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `aws` builds against the deployed Amplify backend; anything else builds the local demo. */
  readonly VITE_BACKEND?: string;
  /** Overrides custom.publicChatUrl from amplify_outputs.json. */
  readonly VITE_PUBLIC_CHAT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
