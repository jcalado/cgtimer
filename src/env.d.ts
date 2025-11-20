/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly ELECTRON_RENDERER_URL: string
  }
}
