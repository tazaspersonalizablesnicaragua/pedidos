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
    // 1. Obtener la ruta del archivo antes de borrar el registro
    const image = db.prepare('SELECT ruta_imagen FROM pedido_imagenes WHERE id = ?').get(imageId);

    if (image) {
      // 2. Intentar borrar el archivo físico
      const filePath = path.join(process.cwd(), 'public', image.ruta_imagen);
      try {
        await unlink(filePath);
      } catch (err) {
        console.error("El archivo no existe en el disco, procediendo a borrar registro.");
      }

      // 3. Borrar el registro de la base de datos
      db.prepare('DELETE FROM pedido_imagenes WHERE id = ?').run(imageId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
