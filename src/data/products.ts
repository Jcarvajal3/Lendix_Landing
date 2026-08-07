import { supabaseAdmin } from '../lib/supabase-admin';

export type Product = {
  /** slug usado tambien como nombre del archivo de imagen en /public/products */
  slug: string;
  name: string;
  category: string;
  /** Descripcion corta, una linea */
  blurb: string;
  /** Renta quincenal en USD (se cobra cada 15 dias) */
  biweekly: number;
  /** Precio de compra de referencia en USD, para la comparativa */
  retail: number;
  /** 2-3 specs cortas mostradas como chips */
  specs: string[];
  badge?: string;
  /**
   * 'inmediata' = hay unidades listas, se entrega en 48 h.
   * 'pedido'    = no hay stock ahora; el cliente lo solicita y lo conseguimos.
   */
  entrega: 'inmediata' | 'pedido';
};

/** Descuento por comprometerse a 12 meses en vez de ir mes a mes. */
export const LOYALTY_DISCOUNT = 0;

export type Plan = 'libre' | 'anual';

/** Renta quincenal segun el plan elegido. */
export function priceFor(biweekly: number, plan: Plan): number {
  return plan === 'libre' ? biweekly : Math.round(biweekly * (1 - LOYALTY_DISCOUNT));
}

export const products: Product[] = [
  {
    slug: 'nintendo-switch-refurbished',
    name: 'Nintendo Switch',
    category: 'Gaming',
    blurb: 'Consola híbrida reacondicionada en excelente estado con Joy-Con.',
    biweekly: 10,
    retail: 200,
    specs: ['Pantalla HD 6.2"', '32 GB Almacenamiento', 'Joy-Con Incluidos'],
    badge: 'Oferta',
    entrega: 'inmediata',
  },
  {
    slug: 'lenovo-thinkpad-t14',
    name: 'Lenovo ThinkPad T14',
    category: 'Laptops',
    blurb: 'Laptop profesional 14" Intel Core i5 Gen 10, 16GB RAM y 256GB SSD.',
    biweekly: 20,
    retail: 599,
    specs: ['Intel Core i5 10ma Gen', '16 GB RAM · 256 GB SSD', 'Pantalla 14" FHD'],
    badge: 'Ideal Trabajo',
    entrega: 'inmediata',
  },
  {
    slug: 'iphone-14',
    name: 'Apple iPhone 14',
    category: 'Celulares',
    blurb: 'Super Retina XDR de 6.1 pulgadas y potente chip A15 Bionic.',
    biweekly: 17.5,
    retail: 599,
    specs: ['Pantalla OLED 6.1"', 'Chip A15 Bionic', '128 GB Almacenamiento'],
    badge: 'Popular',
    entrega: 'inmediata',
  },
  {
    slug: 'lavavajillas-euhomy',
    name: 'Lavavajillas Portable Euhomy',
    category: 'Hogar',
    blurb: 'Lavavajillas compacto de encimera para apartamentos y casas.',
    biweekly: 15,
    retail: 299,
    specs: ['De encimera', 'Múltiples programas', 'Sin instalación complicada'],
    entrega: 'inmediata',
  },
  {
    slug: 'roomba-combo-j5',
    name: 'Roomba Combo j5 Mopa y Aspiradora',
    category: 'Hogar',
    blurb: 'Robot aspirador y friegasuelos inteligente con mapeo PrecisionVision.',
    biweekly: 15,
    retail: 170,
    specs: ['Aspirado y Mopa 2en1', 'Navegación Inteligente', 'Control por App'],
    entrega: 'inmediata',
  },
  {
    slug: 'hisense-58-qled-tv',
    name: 'Hisense 58" Smart TV 4K QLED',
    category: 'TV',
    blurb: 'Televisor 58 pulgadas QLED 4K UHD con sistema Roku TV integrado.',
    biweekly: 20,
    retail: 210,
    specs: ['Panel 58" 4K QLED', 'Roku TV Integrado', 'HDR10+ / Dolby Vision'],
    entrega: 'inmediata',
  },
  {
    slug: 'ipad-10-2-9th-gen',
    name: 'Apple iPad 10.2" 9na Gen',
    category: 'Tablets',
    blurb: 'Pantalla Retina 10.2 pulgadas con Chip A13 Bionic.',
    biweekly: 15,
    retail: 162,
    specs: ['Pantalla Retina 10.2"', 'Chip A13 Bionic', '64 GB Almacenamiento'],
    badge: 'Joya',
    entrega: 'inmediata',
  },
  {
    slug: 'apple-watch-series-7',
    name: 'Apple Watch Series 7',
    category: 'Gadgets',
    blurb: 'Pantalla Retina siempre activa más grande y sensores de salud.',
    biweekly: 10,
    retail: 249,
    specs: ['Always-On Retina', 'Sensor SpO2 y ECG', 'Carga rápida USB-C'],
    entrega: 'inmediata',
  },
  {
    slug: 'playstation-4-slim',
    name: 'PlayStation 4 Slim 500GB',
    category: 'Gaming',
    blurb: 'Consola PS4 Slim 500GB con control inalámbrico DualShock 4.',
    biweekly: 15,
    retail: 199,
    specs: ['500 GB Almacenamiento', 'Mando DualShock 4', 'Soporte HDR'],
    entrega: 'inmediata',
  },
  {
    slug: 'nintendo-switch-2',
    name: 'Nintendo Switch 2',
    category: 'Gaming',
    blurb: 'La consola de nueva generación de Nintendo recién lanzada.',
    biweekly: 25,
    retail: 499,
    specs: ['Pantalla 7.9" HDR', '256 GB Almacenamiento', 'Joy-Con 2 Incluidos'],
    badge: 'Nuevo Launch',
    entrega: 'inmediata',
  },
  {
    slug: 'playstation-5-digital',
    name: 'PlayStation 5 Digital Edition',
    category: 'Gaming',
    blurb: 'Consola PS5 Digital con almacenamiento SSD ultrarrápido.',
    biweekly: 18,
    retail: 449,
    specs: ['SSD Ultra Rápido', 'Mando DualSense', 'Juegos 4K 120Hz'],
    badge: 'Top Gaming',
    entrega: 'inmediata',
  },
  {
    slug: 'airpods-4',
    name: 'Apple AirPods 4',
    category: 'Audio',
    blurb: 'Auriculares inalámbricos con Audio Espacial e integración Apple.',
    biweekly: 6,
    retail: 129,
    specs: ['Audio Espacial', 'Estuche USB-C', 'Resistentes al sudor'],
    entrega: 'inmediata',
  },
];

/** Cuanto ahorras en tu primer mes frente a comprar de contado */
export function firstMonthSaving(p: Product): number {
  return p.retail - p.biweekly * 2;
}

/**
 * Obtiene la lista completa de productos fusionando el catálogo estático con
 * cualquier override de precio guardado en la tabla `product_overrides` de Supabase.
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const { data: overrides, error } = await supabaseAdmin
      .from('product_overrides')
      .select('slug, biweekly, retail');

    if (error || !overrides || overrides.length === 0) {
      return products;
    }

    const map = new Map(overrides.map((o: any) => [o.slug, o]));

    return products.map((p) => {
      const override = map.get(p.slug);
      if (override) {
        return {
          ...p,
          biweekly: Number(override.biweekly),
          retail: Number(override.retail),
        };
      }
      return p;
    });
  } catch (err) {
    console.error('Error al obtener overrides de productos de Supabase:', err);
    return products;
  }
}

