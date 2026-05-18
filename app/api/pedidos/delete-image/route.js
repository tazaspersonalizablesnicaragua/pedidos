import db from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get('id');

  if (!imageId) {
    return NextResponse.json({ error: 'ID de imagen requerido' }, { status: 400 });
  }

  try {
    // 1. Obtener la ruta del archivo desde SQLite Cloud antes de borrar el registro
    const imageResult = await db.sql`SELECT ruta_imagen FROM pedido_imagenes WHERE id = ${imageId}`;
    
    // Validar y unificar la lectura del arreglo de filas devuelto por la nube
    const rows = Array.isArray(imageResult) ? imageResult : (imageResult.rows || []);
    const image = rows[0];

    if (image) {
      // 2. Intentar borrar el archivo físico del servidor local
      if (image.ruta_imagen) {
        const filePath = path.join(process.cwd(), 'public', image.ruta_imagen);
        try {
          await unlink(filePath);
        } catch (err) {
          console.error("El archivo no existe en el disco, procediendo a borrar registro.");
        }
      }

      // 3. Borrar el registro de la base de datos de forma asíncrona en la nube
      await db.sql`DELETE FROM pedido_imagenes WHERE id = ${imageId}`;
    } else {
      return NextResponse.json({ error: 'Imagen no encontrada en el registro' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar imagen individual (SQLite Cloud):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
