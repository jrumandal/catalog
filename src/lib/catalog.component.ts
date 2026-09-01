import {
  Component,
  EventEmitter,
  Inject,
  InjectionToken,
  Input,
  Optional,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { cssVar, Tokens } from '@jrumandal/design-tokens';
import {
  CatalogEvent,
  EventBus,
  type MFEventMap,
} from '@jrumandal/event-bus';
import type {
  Category,
  Product,
  MfApolloClient,
} from '@jrumandal/contracts';
import {
  getBridgeAdapter,
  type ScanResult,
} from '@jrumandal/bridge';

/**
 * Injection token carrying the initial SSR props for the catalog MF.
 *
 * Provided by `ssr.ts` during server rendering so the component can seed its
 * `@Input`s before serialization. Absent in the browser (the shell sets the
 * inputs directly on the custom element), hence `@Optional()`.
 */
export const CATALOG_SSR_PROPS = new InjectionToken<{
  products?: Product[];
  categories?: Category[];
  eventBus?: EventBus<MFEventMap> | null;
}>('CATALOG_SSR_PROPS');

/**
 * The catalog micro-frontend's root component.
 *
 * Rendered as the custom element `<mf-catalog>` (see `register.ts`). It is a
 * standalone, light-DOM Angular component so it can be:
 *  - server-side rendered to an HTML string (`ssr.ts`), and
 *  - hydrated / driven in the browser as a web component (`register.ts`).
 *
 * It receives its data through `@Input` (products + categories) so it is
 * framework-agnostic and testable: the shell or a server injects the data, and
 * the component only renders it. It emits both a DOM `Event` (for the host
 * page) and, when an `EventBus` is provided, a typed cross-MF event.
 *
 * Uses Angular 17+ built-in `@if` / `@for` control flow (no `CommonModule`).
 */
@Component({
  selector: 'mf-catalog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="catalog">
      <header class="catalog__header">
        <h2 class="catalog__title">Catalog</h2>
        <span class="catalog__count" [style.color]="colorSecondary">
          {{ products.length }} product{{ products.length === 1 ? '' : 's' }}
        </span>
        <button
          type="button"
          class="catalog__scan"
          [style.background]="brand"
          [style.color]="inverse"
          [disabled]="scanning"
          (click)="onScanProduct()"
        >
          {{ scanning ? 'Scanning…' : 'Scan product' }}
        </button>
      </header>

      @if (scanResult) {
        <div class="catalog__scan-result" [style.borderColor]="border">
          <img
            class="catalog__scan-image"
            [src]="scanResult.image"
            alt="Scanned product"
          />
          <p class="catalog__scan-source" [style.color]="colorSecondary">
            Captured via {{ scanResult.source === 'capacitor' ? 'native camera' : 'web camera' }}
          </p>
        </div>
      }

      @if (scanError) {
        <p class="catalog__scan-error" [style.color]="danger">{{ scanError }}</p>
      }

      @if (categories.length) {
        <div class="catalog__categories">
          <button
            type="button"
            class="catalog__chip"
            [class.is-active]="activeCategory === null"
            [style.background]="activeCategory === null ? brand : 'transparent'"
            [style.color]="activeCategory === null ? inverse : colorPrimary"
            [style.borderColor]="border"
            (click)="onFilterCategory(null)"
          >
            All
          </button>
          @for (c of categories; track c.id) {
            <button
              type="button"
              class="catalog__chip"
              [class.is-active]="activeCategory === c.slug"
              [style.background]="activeCategory === c.slug ? brand : 'transparent'"
              [style.color]="activeCategory === c.slug ? inverse : colorPrimary"
              [style.borderColor]="border"
              (click)="onFilterCategory(c.slug)"
            >
              {{ c.name }}
            </button>
          }
        </div>
      }

      @if (visibleProducts.length) {
        <ul class="catalog__grid">
          @for (p of visibleProducts; track p.id) {
            <li
              class="catalog__card"
              [style.borderColor]="border"
              [style.background]="surface"
              (click)="onProductClick(p)"
            >
              <h3 class="catalog__card-name" [style.color]="colorPrimary">
                {{ p.name }}
              </h3>
              <p class="catalog__card-desc" [style.color]="colorSecondary">
                {{ p.description || 'No description' }}
              </p>
              <div class="catalog__card-meta">
                <span class="catalog__price" [style.color]="brand">
                  {{ formatPrice(p.price.currency, p.price.amount) }}
                </span>
                <span
                  class="catalog__stock"
                  [style.color]="p.inStock ? success : danger"
                >
                  {{ p.inStock ? 'In stock' : 'Out of stock' }}
                </span>
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="catalog__empty" [style.color]="colorSecondary">
          No products match the current filter.
        </p>
      }
    </div>
  `,
})
export class CatalogComponent {
  /** Products to render. Injected by the shell / server. */
  @Input() products: Product[] = [];
  /** Categories for the filter bar. Injected by the shell / server. */
  @Input() categories: Category[] = [];

  constructor(
    @Optional() @Inject(CATALOG_SSR_PROPS)
    private readonly ssrProps?: {
      products?: Product[];
      categories?: Category[];
      eventBus?: EventBus<MFEventMap> | null;
    },
  ) {
    // Seed inputs from the SSR props token when present (server render only).
    if (this.ssrProps) {
      if (this.ssrProps.products) this.products = this.ssrProps.products;
      if (this.ssrProps.categories) this.categories = this.ssrProps.categories;
      if (this.ssrProps.eventBus) this.eventBus = this.ssrProps.eventBus;
    }
  }
  /**
   * Optional cross-MF event bus. When present, catalog domain events are also
   * published here (in addition to the DOM event) so other micro-frontends can
   * react. The component never imports another MF — only this shared contract.
   */
  @Input() eventBus: EventBus<MFEventMap> | null = null;

  /**
   * Optional shared Apollo client. When present, the component can issue typed
   * GraphQL queries/mutations against the gateway (e.g. product queries,
   * category browse) instead of relying solely on injected props.
   */
  @Input() apolloClient: MfApolloClient | null = null;

  /** Fired (as a DOM `Event`) when a product card is activated. */
  @Output() productSelected = new EventEmitter<Product>();
  /** Fired (as a DOM `Event`) when the category filter changes. */
  @Output() filterChanged = new EventEmitter<string | null>();

  /** Currently selected category slug, or `null` for "all". */
  activeCategory: string | null = null;

  /** True while a camera capture is in flight (disables the scan button). */
  scanning = false;
  /** The most recent successful capture, or `null` when none yet. */
  scanResult: ScanResult | null = null;
  /** A human-readable error from the last failed capture, or `null`. */
  scanError: string | null = null;

  // Design tokens resolved to `var(--token)` strings once for the template.
  readonly colorPrimary = cssVar(Tokens.color.textPrimary);
  readonly colorSecondary = cssVar(Tokens.color.textSecondary);
  readonly brand = cssVar(Tokens.color.brand600);
  readonly inverse = cssVar(Tokens.color.textInverse);
  readonly surface = cssVar(Tokens.color.surface);
  readonly border = cssVar(Tokens.color.border);
  readonly success = cssVar(Tokens.color.success);
  readonly danger = cssVar(Tokens.color.danger);

  /** Products after applying the active category filter. */
  get visibleProducts(): Product[] {
    if (this.activeCategory === null) {
      return this.products;
    }
    return this.products.filter((p) =>
      p.categories.some((c) => c.slug === this.activeCategory),
    );
  }

  /** Format integer cents + currency code into a display string (e.g. `$249.99`). */
  formatPrice(currency: string, amountCents: number): string {
    const major = amountCents / 100;
    const symbol = currency === 'USD' ? '$' : `${currency} `;
    return `${symbol}${major.toFixed(2)}`;
  }

  /** Change the active category filter and notify consumers. */
  onFilterCategory(slug: string | null): void {
    this.activeCategory = slug;
    this.filterChanged.emit(slug);
    this.eventBus?.emit(CatalogEvent['catalog:filterChanged'], {
      category: slug ?? undefined,
    });
  }

  /** A product card was activated: notify consumers + publish to the bus. */
  onProductClick(product: Product): void {
    this.productSelected.emit(product);
    this.eventBus?.emit(CatalogEvent['catalog:productViewed'], {
      productId: product.id,
      source: 'mf-catalog',
    });
  }

  /**
   * "Scan product" demo: capture an image through the shared bridge adapter.
   *
   * The adapter transparently picks the native Capacitor camera when running
   * inside the mobile app, and falls back to the Web `getUserMedia` API in a
   * plain browser. The captured image (a `data:` URL) is shown inline so the
   * demo is visible in both environments.
   */
  async onScanProduct(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    this.scanError = null;
    try {
      this.scanResult = await getBridgeAdapter().scanProduct();
    } catch (err) {
      this.scanResult = null;
      this.scanError =
        err instanceof Error ? err.message : 'Camera capture failed.';
    } finally {
      this.scanning = false;
    }
  }
}
