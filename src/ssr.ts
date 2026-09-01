/**
 * Angular micro-frontend SSR entry.
 *
 * Renders the `<mf-catalog>` component to an HTML string on the server (Node).
 * The shell calls `render(props)` and inlines the returned markup.
 *
 * Uses `@angular/platform-server`'s `renderApplication` with a
 * `bootstrapApplication` bootstrap function (the Angular 20 SSR API surface).
 * The initial inputs are passed to the component via the `CATALOG_SSR_PROPS`
 * injection token, which the component reads in its constructor, so the
 * server output reflects the given props.
 */
import 'zone.js';
import { renderApplication } from '@angular/platform-server';
import { bootstrapApplication, type BootstrapContext } from '@angular/platform-browser';
import { CATALOG_SSR_PROPS, CatalogComponent } from './lib/catalog.component';
import type { EventBus, MFEventMap } from '@jrumandal/event-bus';
import type { Category, Product } from '@jrumandal/contracts';

/** The props the shell passes to the catalog micro-frontend. */
export interface CatalogProps {
  products?: Product[];
  categories?: Category[];
  eventBus?: EventBus<MFEventMap> | null;
}

/**
 * Render the catalog micro-frontend to an HTML string.
 *
 * @param props Optional initial inputs (products / categories / event bus).
 * @returns A promise that resolves to the serialized inner HTML of `<mf-catalog>`.
 */
export async function render(props: CatalogProps = {}): Promise<string> {
  const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(CatalogComponent, {
      providers: [{ provide: CATALOG_SSR_PROPS, useValue: props }],
    }, context);

  const doc =
    '<!doctype html><html><head></head><body><mf-catalog></mf-catalog></body></html>';
  const html = await renderApplication(bootstrap, { document: doc, url: '/catalog' });

  // Extract the inner HTML of the <mf-catalog> element so the shell can inline it.
  const match = html.match(/<mf-catalog[^>]*>([\s\S]*?)<\/mf-catalog>/);
  return match ? match[1] : html;
}

export { CatalogComponent };
