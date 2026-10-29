/// <reference types="astro/client" />

declare module 'virtual:factory/config' {
  const config: import('./integration.ts').FactoryRuntimeConfig;
  export default config;
}
