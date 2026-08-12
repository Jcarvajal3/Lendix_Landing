/**
 * La selección de renta (producto + plan) que el usuario hace en el modal,
 * guardada mientras da la vuelta por Google y regresa a /completar-registro.
 *
 * Va en localStorage y no en sessionStorage: el login con Google saca al
 * usuario del sitio y lo trae de vuelta, y sessionStorage se pierde si el
 * proveedor abre el flujo en otra pestaña o si el navegador restaura la
 * navegación. localStorage sobrevive el viaje completo.
 */

const KEY = 'lendix_rent_selection';

export interface RentSelection {
  product_slug: string;
  product_name: string;
  /** Plan elegido: '6' | '12' | '18' | '24' (cuotas quincenales) */
  plan: string;
  /** Precio por cuota del plan elegido */
  cuota: number;
  /** Precio final de compra tras alquilar */
  buyout: number;
}

export function saveRentSelection(selection: RentSelection) {
  try {
    localStorage.setItem(KEY, JSON.stringify(selection));
  } catch {
    // Modo privado o storage lleno: no es fatal, el usuario solo tendrá que
    // volver a elegir el equipo.
  }
}

export function readRentSelection(): RentSelection | null {
  try {
    // sessionStorage se sigue leyendo para no romper a quien quedó a medio
    // flujo con la versión anterior del código.
    const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RentSelection;
    if (!parsed?.product_slug || !parsed?.plan) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRentSelection() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
