# Lendix — Landing Page

Landing de una sola pagina para **Lendix**, plataforma de renta de productos
electronicos y electrodomesticos. Sirve para dos cosas a la vez:

1. **Explicar el modelo de negocio** a alguien que nunca ha oido hablar de
   renta por suscripcion. Todo esta escrito para que se entienda a la primera.
2. **Medir interes real** con campanas de publicidad, capturando leads en una
   lista de espera junto con el producto que cada persona quiere rentar.

---

## Stack

| Pieza      | Eleccion                    | Por que                                                       |
| ---------- | --------------------------- | ------------------------------------------------------------- |
| Framework  | [Astro 5](https://astro.build) | HTML estatico, cero JS por defecto. Carga casi instantanea. |
| Estilos    | Tailwind CSS v4             | Tokens de marca en un solo archivo, sin CSS muerto.           |
| Tipografia | Space Grotesk + Inter       | Self-hosted via Fontsource: sin llamadas a Google Fonts.      |
| Leads      | Supabase (REST directo)     | Un `fetch`, sin SDK. No suma peso al bundle.                  |
| Deploy     | Vercel                      | Conectado al repo, despliega en cada push a `main`.           |

Todo el JavaScript de la pagina son unas pocas lineas inline (menu movil,
selector de plan, acordeon, formulario). No hay framework de UI en el cliente.

---

## Empezar

```bash
npm install
npm run dev
```

Abre http://localhost:4321

| Comando           | Que hace                                  |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Servidor de desarrollo con recarga en vivo |
| `npm run build`   | Genera el sitio estatico en `dist/`        |
| `npm run preview` | Sirve `dist/` para revisar antes de subir  |

---

## Estructura

```
src/
├── pages/index.astro        # La landing: solo ordena las secciones
├── layouts/Base.astro       # <head>, SEO, fuentes, animaciones de scroll
├── data/products.ts         # Catalogo y precios — edita aqui, no en el HTML
├── styles/global.css        # Manual de marca: colores, tipografias, radios
└── components/
    ├── Nav.astro            # Barra superior + menu movil
    ├── Hero.astro           # Portada
    ├── Explainer.astro      # "Que es Lendix" — la explicacion basica
    ├── HowItWorks.astro     # Los 4 pasos + las 3 formas de terminar
    ├── Catalog.astro        # Productos + selector de plan
    ├── Compare.astro        # Tabla rentar vs comprar
    ├── Included.astro       # Que incluye la renta
    ├── ForWhom.astro        # Perfiles de uso
    ├── Faq.astro            # Preguntas frecuentes
    ├── Waitlist.astro       # Formulario de lista de espera (Supabase)
    ├── Footer.astro
    ├── ProductImage.astro   # Imagen con fondo de marca y fallback
    └── Logo.astro
```

### Como agregar una seccion nueva

1. Crea `src/components/MiSeccion.astro`.
2. Importala en `src/pages/index.astro` y ponla en el orden que quieras.
3. Si debe salir en el menu, agrega su `id` al array `links` de `Nav.astro`.

Cuando la landing crezca a varias paginas, cada archivo nuevo en `src/pages/`
se convierte automaticamente en una ruta (`src/pages/empresas.astro` →
`/empresas`). El `Base.astro` ya esta listo para reutilizarse.

---

## Contenido que hay que actualizar

### Fotos de producto (pendiente)

Faltan las fotos reales. Van en `public/products/` con el nombre exacto del
`slug` de cada producto. Ver [`docs/fotos-de-producto.md`](docs/fotos-de-producto.md)
para la lista de archivos y las especificaciones recomendadas.

Mientras no existan, cada tarjeta muestra el degradado de marca con el nombre
del producto encima. **La pagina no se rompe**, pero conviene ponerlas antes de
gastar en publicidad.

### Precios y catalogo

Todo vive en [`src/data/products.ts`](src/data/products.ts). Cambiar un precio
es cambiar un numero ahi; la landing y el formulario se actualizan solos.

Los precios estan en **USD** y son referenciales para el lanzamiento en
Venezuela. El plan de 12 meses aplica un 20% de descuento, definido en la
constante `LOYALTY_DISCOUNT` de `Catalog.astro`.

---

## Conectar Supabase (formulario de leads)

Sin esto el formulario valida pero no guarda nada, y le muestra al usuario un
correo de contacto en vez de fallar en silencio.

**1. Crear la tabla.** En el dashboard de Supabase, SQL Editor, pega y ejecuta
[`supabase/migrations/0001_waitlist_lead.sql`](supabase/migrations/0001_waitlist_lead.sql).

**2. Copiar las credenciales.** Project Settings → API:

```bash
cp .env.example .env
```

Rellena `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`.

**3. En Vercel**, agrega esas dos variables en Settings → Environment
Variables y vuelve a desplegar.

### Sobre la seguridad

La `anon key` viaja en el navegador — eso es normal y esperado en Supabase. La
proteccion real esta en las RLS policies del archivo de migracion: la landing
**solo puede insertar** leads. No puede leerlos, editarlos ni borrarlos. Para
ver los leads hay que entrar al dashboard de Supabase.

### Ver los resultados

```sql
-- Todos los leads, mas recientes primero
select * from waitlist_lead order by created_at desc;

-- Que producto pide mas la gente (esto es lo que le muestras a un inversor)
select * from waitlist_demanda;

-- De que campana publicitaria vino cada lead
select utm_source, utm_campaign, count(*)
from waitlist_lead group by 1, 2 order by 3 desc;
```

El formulario captura automaticamente `utm_source`, `utm_medium`,
`utm_campaign`, `utm_content` y el `referrer`, asi que puedes medir que anuncio
trae leads mas baratos. Solo agrega los parametros a la URL del anuncio:

```
https://lendix.app/?utm_source=instagram&utm_medium=cpc&utm_campaign=lanzamiento
```

---

## Deploy en Vercel

1. Vercel → Add New Project → importa `Jcarvajal3/Lendix_Landing`.
2. Vercel detecta Astro solo. Si lo pide: build `npm run build`, output `dist`.
3. Agrega las dos variables de entorno de Supabase.
4. Deploy. A partir de ahi, cada push a `main` se publica automaticamente.

> Si el repo tiene la landing dentro de una subcarpeta, pon `Landing` como
> **Root Directory** en la configuracion del proyecto en Vercel.

Despues de conectar el dominio real, actualiza `site` en
[`astro.config.mjs`](astro.config.mjs) y la URL del `Sitemap` en
[`public/robots.txt`](public/robots.txt) — de ahi salen las URLs canonicas y
las previsualizaciones al compartir el link.

---

## Notas de contenido

La landing **no inventa cifras de traccion ni testimonios**. No hay "45.000
clientes satisfechos" ni resenas ficticias, porque el producto todavia no ha
lanzado y a un inversor le basta con verificar una sola de esas afirmaciones
para perder la confianza en todo lo demas. En su lugar, la seccion "Para quien
es" plantea situaciones de uso, que comunica lo mismo sin afirmar nada falso.

Cuando existan clientes reales, esa seccion es el lugar natural para sus
testimonios.
