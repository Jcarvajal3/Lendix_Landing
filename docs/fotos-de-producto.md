# Fotos de producto

Coloca aqui las fotos del catalogo. **El nombre del archivo debe coincidir
exactamente con el `slug` definido en `src/data/products.ts`:**

| Archivo esperado             | Producto                  |
| ---------------------------- | ------------------------- |
| `nintendo-switch-2.webp`     | Nintendo Switch 2         |
| `macbook-air-2020.webp`      | MacBook Air 2020          |
| `lenovo-thinkpad.webp`       | Lenovo ThinkPad           |
| `lavadora-samsung.webp`      | Lavadora Samsung 19 kg    |
| `pantalla-samsung-55.webp`   | Samsung Crystal UHD 55"   |

## Recomendaciones

- **Formato:** `.webp` (mucho mas liviano que PNG/JPG con la misma calidad).
- **Tamano:** 1200 x 900 px aprox., relacion 4:3.
- **Fondo:** preferiblemente transparente o blanco. Las tarjetas ya traen un
  degradado de marca detras, asi que el producto recortado se ve mejor.
- **Peso:** por debajo de 150 KB por imagen.

Mientras no exista el archivo, la tarjeta muestra el degradado de marca con el
nombre del producto en vez de una imagen rota. No se rompe nada.

## Imagen para compartir

`public/og.png` (1200 x 630 px) ya existe: es la que se ve al compartir el link
en WhatsApp, Instagram o LinkedIn. Es una version generada con los colores de
marca; reemplazala cuando haya una pieza grafica definitiva.
