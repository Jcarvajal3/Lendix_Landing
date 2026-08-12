import { supabaseAdmin } from '../lib/supabase-admin';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type PlanKey = '6' | '12' | '18' | '24';

export type PlanPricing = {
  /** Precio por cuota (quincenal) */
  cuota: number;
  /** Precio final de compra tras alquilar con este plan */
  buyout: number;
};

export const PLAN_KEYS: PlanKey[] = ['6', '12', '18', '24'];

export const PLAN_LABELS: Record<PlanKey, { cuotas: string; meses: string }> = {
  '6':  { cuotas: '6 cuotas',  meses: '3 meses' },
  '12': { cuotas: '12 cuotas', meses: '6 meses' },
  '18': { cuotas: '18 cuotas', meses: '9 meses' },
  '24': { cuotas: '24 cuotas', meses: '12 meses' },
};

export type Product = {
  slug: string;
  name: string;
  category: string;
  /** Descripción corta, una línea */
  blurb: string;
  /** Precio de compra de referencia en USD (comparativa vs retail) */
  retail: number;
  /** 2-3 specs cortas mostradas como chips */
  specs: string[];
  badge?: string;
  entrega: 'inmediata' | 'pedido';
  /** URL de imagen override (Supabase Storage) */
  image_url?: string;
  /** Orden de aparición en el catálogo */
  sort_order: number;
  /** Pricing por plan de cuotas */
  pricing: Record<PlanKey, PlanPricing>;
};

export type Plan = '3meses';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Constantes del modelo de negocio — ajustar según la operación real
// ---------------------------------------------------------------------------
const BIZ = {
  cuotasAncla: 28,       // Cuotas base para recuperar costo
  descuento: { 6: 0, 12: 0.08, 18: 0.14, 24: 0.20 } as Record<number, number>,
  impago: 0.05,          // Tasa de impago (5%)
  friccion: 0.03,        // Fricción de cobro (3%)
  seguroAnual: 50,       // Costo de seguro anual por producto ($)
  sueldoEmpleado: 800,   // Sueldo mensual por empleado ($)
  cargaLaboral: 0.40,    // Carga laboral (40%)
  flota: 100,            // Tamaño de la flota de productos
  adminMensual: 5,       // Costo admin mensual por producto ($)
  entrega: 15,           // Costo de entrega por producto ($)
  reacond: 20,           // Costo de reacondicionamiento ($)
  recuperacion: 0.50,    // Tasa de recuperación en impagos (50%)
  valorUsado: 0.50,      // Factor de valor del producto usado
  ganancia: { 6: 0.30, 12: 0.50, 18: 0.62, 24: 0.75 } as Record<number, number>,
  residual: { 6: 0.75, 12: 0.60, 18: 0.52, 24: 0.45 } as Record<number, number>,
};

/**
 * Calcula cuota quincenal y precio final de compra para un plan dado.
 * C = precio retail de referencia, Q = número de cuotas quincenales.
 */
function calcularPlan(C: number, Q: number): PlanPricing {
  const M = Q / 2; // meses

  // 1. Cuota de alquiler
  const R = (C / BIZ.cuotasAncla) * (1 - (BIZ.descuento[Q] ?? 0));

  // 2. Revenue neto después de costos operativos
  const k    = (1 - BIZ.impago / 2) * (1 - BIZ.friccion);
  const fijo = BIZ.seguroAnual / 12
             + BIZ.sueldoEmpleado * (1 + BIZ.cargaLaboral) / BIZ.flota
             + BIZ.adminMensual;
  const perd = BIZ.impago * (1 - BIZ.recuperacion) * (C + C * BIZ.valorUsado) / 2;
  const neto = R * k * Q - fijo * M - BIZ.entrega - BIZ.reacond - perd;

  // 3. Precio final de compra (buyout)
  const buyout = Math.max(
    C * (BIZ.ganancia[Q] ?? 0.30) + C - neto,
    C * (BIZ.residual[Q] ?? 0.50),
  );

  return {
    cuota: Math.round(R * 2) / 2, // redondear a $0.50
    buyout: Math.round(buyout),
  };
}

/**
 * Genera pricing completo para los 4 planes a partir del precio retail.
 * El admin puede override cualquier valor individualmente.
 */
export function defaultPricing(retail: number): Record<PlanKey, PlanPricing> {
  return {
    '6':  calcularPlan(retail, 6),
    '12': calcularPlan(retail, 12),
    '18': calcularPlan(retail, 18),
    '24': calcularPlan(retail, 24),
  };
}

/** Cuánto ahorras en tu primer mes vs comprar de contado, para un plan dado. */
export function firstMonthSaving(p: Product, plan: PlanKey = '6'): number {
  return p.retail - p.pricing[plan].cuota * 2;
}

/** Renta quincenal (alias para compatibilidad). */
export function priceFor(cuota: number, _plan?: Plan): number {
  return cuota;
}

// ---------------------------------------------------------------------------
// Catálogo estático
// ---------------------------------------------------------------------------

export const products: Product[] = [
  {
    slug: 'nintendo-switch-oled',
    name: 'Nintendo Switch OLED',
    category: 'Gaming',
    blurb: 'Consola híbrida con pantalla OLED de 7 pulgadas y audio mejorado.',
    retail: 569,
    pricing: defaultPricing(569),
    specs: ['Pantalla OLED 7.0"', '64 GB Almacenamiento', 'Joy-Con Incluidos'],
    badge: 'Popular',
    entrega: 'inmediata',
    sort_order: 0,
  },
  {
    slug: 'playstation-4-slim',
    name: 'PlayStation 4 Slim Pro',
    category: 'Gaming',
    blurb: 'Consola PS4 Slim/Pro con control inalámbrico DualShock 4.',
    retail: 299,
    pricing: defaultPricing(299),
    specs: ['500 GB Almacenamiento', 'Mando DualShock 4', 'Soporte HDR'],
    badge: 'Gaming',
    entrega: 'inmediata',
    sort_order: 1,
  },
  {
    slug: 'playstation-5-digital',
    name: 'PlayStation 5 Digital Edition',
    category: 'Gaming',
    blurb: 'Consola PS5 Digital con almacenamiento SSD ultrarrápido.',
    retail: 979,
    pricing: defaultPricing(979),
    specs: ['SSD Ultra Rápido', 'Mando DualSense', 'Juegos 4K 120Hz'],
    badge: 'Top Gaming',
    entrega: 'inmediata',
    sort_order: 2,
  },
  {
    slug: 'dell-latitude-14',
    name: 'Dell Latitude 14" Laptop',
    category: 'Laptops',
    blurb: 'i7 11th Gen | 16GB RAM 256GB SSD | Windows',
    retail: 899,
    pricing: defaultPricing(899),
    specs: ['Intel i7 11ma Gen', '16 GB RAM · 256 GB SSD', 'Windows'],
    badge: 'Ideal Trabajo',
    entrega: 'pedido',
    sort_order: 3,
  },
  {
    slug: 'iphone-14',
    name: 'Apple iPhone 14',
    category: 'Celulares',
    blurb: 'Super Retina XDR de 6.1 pulgadas y potente chip A15 Bionic.',
    retail: 599,
    pricing: defaultPricing(599),
    specs: ['Pantalla OLED 6.1"', 'Chip A15 Bionic', '128 GB Almacenamiento'],
    badge: 'Popular',
    entrega: 'pedido',
    sort_order: 4,
  },
  {
    slug: 'lavavajillas-euhomy',
    name: 'Lavavajillas Portable Euhomy',
    category: 'Hogar',
    blurb: 'Lavavajillas compacto de encimera para apartamentos y casas.',
    retail: 299,
    pricing: defaultPricing(299),
    specs: ['De encimera', 'Múltiples programas', 'Sin instalación complicada'],
    entrega: 'pedido',
    sort_order: 5,
  },
  {
    slug: 'roomba-combo-j5',
    name: 'Roomba Combo j5 Mopa y Aspiradora',
    category: 'Hogar',
    blurb: 'Robot aspirador y friegasuelos inteligente con mapeo PrecisionVision.',
    retail: 170,
    pricing: defaultPricing(170),
    specs: ['Aspirado y Mopa 2en1', 'Navegación Inteligente', 'Control por App'],
    entrega: 'pedido',
    sort_order: 6,
  },
  {
    slug: 'hisense-58-qled-tv',
    name: 'Hisense 58" Smart TV 4K QLED',
    category: 'TV',
    blurb: 'Televisor 58 pulgadas QLED 4K UHD con sistema Roku TV integrado.',
    retail: 210,
    pricing: defaultPricing(210),
    specs: ['Panel 58" 4K QLED', 'Roku TV Integrado', 'HDR10+ / Dolby Vision'],
    entrega: 'pedido',
    sort_order: 7,
  },
  {
    slug: 'ipad-10-2-9th-gen',
    name: 'Apple iPad 10.2" 9na Gen',
    category: 'Tablets',
    blurb: 'Pantalla Retina 10.2 pulgadas con Chip A13 Bionic.',
    retail: 162,
    pricing: defaultPricing(162),
    specs: ['Pantalla Retina 10.2"', 'Chip A13 Bionic', '64 GB Almacenamiento'],
    badge: 'Joya',
    entrega: 'pedido',
    sort_order: 8,
  },
  {
    slug: 'apple-watch-series-7',
    name: 'Apple Watch Series 7',
    category: 'Gadgets',
    blurb: 'Pantalla Retina siempre activa más grande y sensores de salud.',
    retail: 249,
    pricing: defaultPricing(249),
    specs: ['Always-On Retina', 'Sensor SpO2 y ECG', 'Carga rápida USB-C'],
    entrega: 'pedido',
    sort_order: 9,
  },
  {
    slug: 'nintendo-switch-2',
    name: 'Nintendo Switch 2',
    category: 'Gaming',
    blurb: 'La consola de nueva generación de Nintendo recién lanzada.',
    retail: 499,
    pricing: defaultPricing(499),
    specs: ['Pantalla 7.9" HDR', '256 GB Almacenamiento', 'Joy-Con 2 Incluidos'],
    badge: 'Nuevo Launch',
    entrega: 'pedido',
    sort_order: 10,
  },
  {
    slug: 'airpods-4',
    name: 'Apple AirPods 4',
    category: 'Audio',
    blurb: 'Auriculares inalámbricos con Audio Espacial e integración Apple.',
    retail: 129,
    pricing: defaultPricing(129),
    specs: ['Audio Espacial', 'Estuche USB-C', 'Resistentes al sudor'],
    entrega: 'pedido',
    sort_order: 11,
  },
];

// ---------------------------------------------------------------------------
// Data fetching con overrides de Supabase
// ---------------------------------------------------------------------------

export async function getProducts(): Promise<Product[]> {
  try {
    const { data: overrides, error } = await supabaseAdmin
      .from('product_overrides')
      .select('*');

    if (error || !overrides || overrides.length === 0) {
      return products.map((p, i) => ({ ...p, sort_order: p.sort_order ?? i }));
    }

    const map = new Map(overrides.map((o: any) => [o.slug, o]));

    // Productos estáticos con overrides aplicados
    const result: Product[] = products.map((p, i) => {
      const o = map.get(p.slug);
      if (o) {
        return {
          ...p,
          name: o.name ?? p.name,
          blurb: o.blurb ?? p.blurb,
          category: o.category ?? p.category,
          specs: o.specs ?? p.specs,
          badge: o.badge !== undefined && o.badge !== null ? o.badge : p.badge,
          entrega: o.entrega ?? p.entrega,
          retail: o.retail != null ? Number(o.retail) : p.retail,
          pricing: o.pricing ?? p.pricing,
          image_url: o.image_url ?? undefined,
          sort_order: o.sort_order ?? p.sort_order ?? i,
        };
      }
      return { ...p, sort_order: p.sort_order ?? i };
    });

    // Productos nuevos creados desde el admin
    const staticSlugs = new Set(products.map(p => p.slug));
    for (const o of overrides) {
      if (!staticSlugs.has(o.slug)) {
        result.push({
          slug: o.slug,
          name: o.name || 'Nuevo Producto',
          blurb: o.blurb || '',
          category: o.category || 'Sin categoría',
          specs: o.specs || [],
          badge: o.badge || undefined,
          entrega: o.entrega || 'pedido',
          retail: Number(o.retail) || 0,
          pricing: o.pricing || defaultPricing(0, 0),
          image_url: o.image_url ?? undefined,
          sort_order: o.sort_order ?? 999,
        });
      }
    }

    result.sort((a, b) => a.sort_order - b.sort_order);
    return result;
  } catch (err) {
    console.error('Error al obtener overrides de productos de Supabase:', err);
    return products.map((p, i) => ({ ...p, sort_order: p.sort_order ?? i }));
  }
}
