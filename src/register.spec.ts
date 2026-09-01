/**
 * Custom-element registration test (JSDOM): `register()` must define the
 * `<mf-catalog>` custom element, and the element must be instantiable.
 */
import 'zone.js';
import '@angular/compiler';
import { CATALOG_ELEMENT_TAG, register } from './register';

describe('mf-catalog custom element', () => {
  it('registers the mf-catalog custom element exactly once', async () => {
    await register();
    await register(); // idempotent

    const Ctor = customElements.get(CATALOG_ELEMENT_TAG);
    expect(Ctor).toBeDefined();
    expect(CATALOG_ELEMENT_TAG).toBe('mf-catalog');
  });

  it('creates an element instance that is an HTMLElement', async () => {
    await register();

    const el = document.createElement('mf-catalog');
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.tagName.toLowerCase()).toBe('mf-catalog');
  });
});
