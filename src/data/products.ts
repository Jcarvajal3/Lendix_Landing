export type Product = {
  /** slug usado tambien como nombre del archivo de imagen en /public/products */
  slug: string;
  name: string;
  category: string;
  /** Descripcion corta, una linea */
  blurb: string;
  /** Renta mensual en USD */
  monthly: number;
  /** Precio de compra de referencia en USD, para la comparativa */
  retail: number;
  /** 2-3 specs cortas mostradas como chips */
  specs: string[];
  badge?: string;
};

export const products: Product[] = [
  {
    slug: 'nintendo-switch-2',
    name: 'Nintendo Switch 2',
    category: 'Gaming',
    blurb: 'La consola del momento, sin pagarla completa.',
    monthly: 32,
    retail: 499,
    specs: ['Pantalla 7.9" HDR', '256 GB', 'Joy-Con 2 incluidos'],
    badge: 'Mas pedido',
  },
  {
    slug: 'macbook-air-2020',
    name: 'MacBook Air 2020',
    category: 'Laptops',
    blurb: 'Chip M1. Silenciosa, rapida y con bateria para todo el dia.',
    monthly: 45,
    retail: 749,
    specs: ['Chip Apple M1', '8 GB RAM · 256 GB SSD', 'Retina 13.3"'],
  },
  {
    slug: 'lenovo-thinkpad',
    name: 'Lenovo ThinkPad',
    category: 'Laptops',
    blurb: 'El caballo de batalla para trabajar sin excusas.',
    monthly: 38,
    retail: 649,
    specs: ['Intel Core i5', '16 GB RAM · 512 GB SSD', 'Teclado ThinkPad'],
    badge: 'Ideal para trabajo',
  },
  {
    slug: 'lavadora-samsung',
    name: 'Lavadora Samsung 19 kg',
    category: 'Hogar',
    blurb: 'Carga superior, digital inverter y muy silenciosa.',
    monthly: 29,
    retail: 459,
    specs: ['19 kg de carga', 'Digital Inverter', 'Eco Bubble'],
  },
  {
    slug: 'pantalla-samsung-55',
    name: 'Samsung Crystal UHD 55"',
    category: 'TV',
    blurb: 'Tu sala, mejorada. Smart TV 4K lista para usar.',
    monthly: 27,
    retail: 429,
    specs: ['55" 4K UHD', 'Tizen Smart TV', 'HDR10+'],
  },
];

/** Cuanto ahorras el primer mes frente a comprar de contado */
export function firstMonthSaving(p: Product): number {
  return p.retail - p.monthly;
}
