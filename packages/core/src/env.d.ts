/// <reference types="astro/client" />

declare module 'virtual:factory/config' {
  const config: import('./integration.ts').FactoryRuntimeConfig;
  export default config;
}

declare module 'virtual:factory/analytics' {
  const Provider: (props: Record<string, unknown>) => unknown;
  export default Provider;
}
