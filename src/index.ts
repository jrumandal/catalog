/**
 * Public entry point for the `@jrumandal/catalog` micro-frontend package.
 *
 * Exposes the Angular component, the custom-element registration / hydration
 * helpers, and the SSR renderer so the shell (or any consumer) can:
 *  - server-side render the catalog to an HTML string (`render`),
 *  - register the `<mf-catalog>` custom element in the browser (`register`),
 *  - hydrate it after first paint (`hydrate`).
 */
export { CatalogComponent, CATALOG_SSR_PROPS } from './lib/catalog.component';
export { render, type CatalogProps } from './ssr';
export { register, CATALOG_ELEMENT_TAG } from './register';
export { hydrate } from './hydrate';
