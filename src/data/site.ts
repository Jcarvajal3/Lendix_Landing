/**
 * Datos de contacto y cierre de venta.
 *
 * WhatsApp es el canal de cierre: el formulario captura el lead y el chat
 * termina la conversion. El numero vive en `PUBLIC_WHATSAPP` (.env) para que
 * se pueda cambiar sin tocar codigo.
 *
 * Formato: solo digitos con codigo de pais, sin +, espacios ni guiones.
 * Ejemplo Venezuela: 584121234567
 */
import { WHATSAPP } from '../lib/env';

const raw = WHATSAPP;

/** Numero listo para wa.me, o '' si todavia no esta configurado. */
export const whatsappNumber = raw.replace(/\D/g, '');

/** Si no hay numero configurado, la UI esconde los botones de WhatsApp. */
export const hasWhatsapp = whatsappNumber.length >= 8;

export const email = 'hola@lendix.app';

/** Link de WhatsApp con mensaje prellenado. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
