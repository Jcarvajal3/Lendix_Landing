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
  /**
   * 'inmediata' = hay unidades listas, se entrega en 48 h.
   * 'pedido'    = no hay stock ahora; el cliente lo solicita y lo conseguimos.
   * Cambia a 'pedido' todo lo que no tengas disponible: el catalogo lo dice
   * claro y el boton pasa de "Rentarlo ahora" a "Solicitarlo".
   */
  entrega: 'inmediata' | 'pedido';
};

/** Descuento por comprometerse a 12 meses en vez de ir mes a mes. */
export const LOYALTY_DISCOUNT = 0.2;

export type Plan = 'libre' | 'anual';

/** Renta mensual segun el plan elegido. */
export function priceFor(monthly: number, plan: Plan): number {
  return plan === 'libre' ? monthly : Math.round(monthly * (1 - LOYALTY_DISCOUNT));
}

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
    entrega: 'inmediata',
  },
  {
    slug: 'macbook-air-2022',
    name: 'MacBook Air 2022',
    category: 'Laptops',
    blurb: 'Chip M2. Silenciosa, rapida y con bateria para todo el dia.',
    monthly: 48,
    retail: 799,
    specs: ['Chip Apple M2', '8 GB RAM · 256 GB SSD', 'Liquid Retina 13.6"'],
    entrega: 'inmediata',
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
    entrega: 'inmediata',
  },
  {
    slug: 'lavadora-samsung',
    name: 'Lavadora Samsung 19 kg',
    category: 'Hogar',
    blurb: 'Carga superior, digital inverter y muy silenciosa.',
    monthly: 29,
    retail: 459,
    specs: ['19 kg de carga', 'Digital Inverter', 'Eco Bubble'],
    entrega: 'inmediata',
  },
  {
    slug: 'lg-oled-tv',
    name: 'LG OLED Smart TV',
    category: 'TV',
    blurb: 'Tu sala, mejorada. Negros perfectos y colores reales.',
    monthly: 39,
    retail: 649,
    specs: ['Panel OLED 4K', 'webOS Smart TV', 'HDR10'],
    entrega: 'inmediata',
  },
  {
    slug: 'ipad-11-pulgadas',
    name: 'Apple iPad 11"',
    category: 'Tablets',
    blurb: 'Potencia y portabilidad para estudiar, trabajar o crear.',
    monthly: 25,
    retail: 399,
    specs: ['Pantalla Liquid Retina 11"', 'Chip Apple M2', '128 GB'],
    entrega: 'inmediata',
  },
  {
    slug: 'aire-acondicionado-albott',
    name: 'Aire Acondicionado Albott 115V',
    category: 'Hogar',
    blurb: 'Refresca tu espacio con bajo consumo y enfriamiento rapido.',
    monthly: 22,
    retail: 350,
    specs: ['115V / 12,000 BTU', 'Inverter Ahorro', 'Control Remoto'],
    entrega: 'inmediata',
  },
  {
    slug: 'silla-neo-chair',
    name: 'Silla Ergonomica Neo Chair',
    category: 'Oficina',
    blurb: 'Ergonomia superior y soporte lumbar para tu jornada laboral.',
    monthly: 7,
    retail: 60,
    specs: ['Soporte Lumbar', 'Malla Transpirable', 'Ajuste Ergonomico'],
    entrega: 'inmediata',
  },
];

/** Cuanto ahorras el primer mes frente a comprar de contado */
export function firstMonthSaving(p: Product): number {
  return p.retail - p.monthly;
}
