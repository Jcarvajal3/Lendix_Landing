import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export const prerender = false;

/**
 * POST /api/admin/upload-product-image
 *
 * Sube una imagen de producto a Supabase Storage y guarda la URL
 * pública en la tabla `product_overrides`.
 *
 * Body: FormData con campos:
 *   - slug: string
 *   - file: File (imagen)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.userProfile || (locals.userProfile.role !== 'admin' && locals.userProfile.role !== 'superadmin')) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const slug = formData.get('slug') as string | null;

    if (!file || !slug) {
      return new Response(JSON.stringify({ error: 'file y slug son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validar que es una imagen
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'El archivo debe ser una imagen' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'La imagen no puede pesar más de 5MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determinar extensión
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const fileName = `${slug}.${ext}`;

    // Convertir a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Subir a Supabase Storage (sobreescribe si ya existe)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error al subir imagen a Supabase Storage:', uploadError);
      return new Response(JSON.stringify({ error: 'Error subiendo imagen: ' + uploadError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    // Guardar la URL en product_overrides
    const { error: dbError } = await supabaseAdmin
      .from('product_overrides')
      .upsert({
        slug,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'slug' });

    if (dbError) {
      console.error('Error al guardar image_url en Supabase:', dbError);
      return new Response(JSON.stringify({ error: 'Imagen subida pero error guardando URL: ' + dbError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Imagen subida exitosamente.',
      image_url: imageUrl,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error in upload-product-image:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
