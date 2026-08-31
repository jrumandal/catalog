/**
 * Client-side custom-element registration for the catalog micro-frontend.
 *
 * Wraps `CatalogComponent` in an `<mf-catalog>` custom element via
 * `@angular/elements`' `createCustomElement`. The element renders into its
 * light DOM (the component uses `ViewEncapsulation.None`), so the shell can
 * place it anywhere and style it with the shared design tokens.
 *
 * Import this module in the browser (shell client bundle) before the element
 * is used. It is a no-op if the element is already registered.
 */
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { CatalogComponent } from './lib/catalog.component';

/** The custom-element tag name. */
export const CATALOG_ELEMENT_TAG = 'mf-catalog';

/**
 * Register the `<mf-catalog>` custom element.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * `createApplication` is asynchronous (it resolves the application's
 * environment injector), so this returns a promise that resolves once the
 * element is defined.
 */
export async function register(): Promise<void> {
  if (typeof customElements !== 'undefined' && customElements.get(CATALOG_ELEMENT_TAG)) {
    return;
  }
  // `@angular/elements` requires the config injector to provide
  // `ComponentFactoryResolver`, `NgZone`, `ApplicationRef`, and
  // `ChangeDetectionScheduler`. A bare `Injector.create([])` provides none of
  // these, so we build a real application injector via `createApplication`
  // (which wires up all four through the environment injector) and pass its
  // `ApplicationRef.injector` to `createCustomElement`.
  const appRef = await createApplication({ providers: [] });
  const Ctor = createCustomElement(CatalogComponent, {
    injector: appRef.injector,
  });
  customElements.define(CATALOG_ELEMENT_TAG, Ctor);
}
