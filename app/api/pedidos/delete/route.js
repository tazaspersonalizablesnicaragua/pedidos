import db from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const pedidoId = searchParams.get('id');

  if (!pedidoId) {
    return NextResponse.json({ error: 'ID de pedido requerido' }, { status: 400 });
  }

  try {
    // 1. Obtener rutas de imágenes físicas desde SQLite Cloud
    const imagenesResult = await db.sql`SELECT ruta_imagen FROM pedido_imagenes WHERE pedido_id = ${pedidoId}`;
    const imagenes = Array.isArray(imagenesResult) ? imagenesResult : (imagenesResult.rows || []);
    
    // Eliminar los archivos físicos del servidor/computadora local
    for (const img of imagenes) {
      if (img.ruta_imagen) {
        const filePath = path.join(process.cwd(), 'public', img.ruta_imagen);
        try {
          await unlink(filePath);
        } catch (err) {
          // Ignorar si el archivo físico ya no existía en el disco
        }
      }
    }

    // 2. Ejecutar la eliminación relacional completa bajo una transacción segura
    await db.sql`BEGIN IMMEDIATE TRANSACTION;`;

    try {
      // Eliminar dependencias en cascada manualmente
      await db.sql`DELETE FROM pedido_productos WHERE pedido_id = ${pedidoId}`;
      await db.sql`DELETE FROM pedido_imagenes WHERE pedido_id = ${pedidoId}`;
      await db.sql`DELETE FROM pedidos WHERE id = ${pedidoId}`;

      // Si todo sale bien, consolidamos los cambios en la nube
      await db.sql`COMMIT;`;
    } catch (dbError) {
      // Si ocurre un error en el borrado, revertimos la base de datos a su estado original
      await db.sql`ROLLBACK;`;
      throw dbError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar pedido (SQLite Cloud):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
