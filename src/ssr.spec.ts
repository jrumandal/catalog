/**
 * SSR test: `render()` must produce an HTML string containing the expected
 * catalog markup (product cards, category chips, prices).
 */
import 'zone.js';
import '@angular/compiler';
import { render } from './ssr';
import type { Category, Product } from '@jrumandal/contracts';

const categories: Category[] = [
  {
    id: 'cat-1',
    name: 'Audio',
    slug: 'audio',
    parentId: null,
    children: [],
  },
];

const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Wireless Headphones',
    description: 'Noise-cancelling over-ear headphones',
    price: { amount: 24999, currency: 'USD' },
    imageUrl: 'https://example.com/headphones.jpg',
    inStock: true,
    categories: [categories[0]],
  },
  {
    id: 'prod-2',
    name: 'USB-C Cable',
    price: { amount: 1299, currency: 'USD' },
    inStock: false,
    categories: [],
  },
];

describe('mf-catalog SSR render', () => {
  it('renders the product grid with product names and formatted prices', async () => {
    const html = await render({ products, categories });

    expect(html).toContain('catalog__grid');
    expect(html).toContain('Wireless Headphones');
    expect(html).toContain('USB-C Cable');
    expect(html).toContain('$249.99');
    expect(html).toContain('$12.99');
  });

  it('renders category filter chips', async () => {
    const html = await render({ products, categories });

    expect(html).toContain('catalog__chip');
    expect(html).toContain('Audio');
    expect(html).toContain('All');
  });

  it('renders stock state and product count', async () => {
    const html = await render({ products, categories });

    expect(html).toContain('In stock');
    expect(html).toContain('Out of stock');
    expect(html).toContain('2 products');
  });

  it('renders the empty state when there are no products', async () => {
    const html = await render({ products: [], categories: [] });

    expect(html).toContain('catalog__empty');
    expect(html).toContain('No products match the current filter.');
  });
});
