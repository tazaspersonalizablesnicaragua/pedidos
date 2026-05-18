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
    // 1. Obtener rutas de imágenes físicas asociadas para borrarlas del almacenamiento
    const imagenes = db.prepare('SELECT ruta_imagen FROM pedido_imagenes WHERE pedido_id = ?').all(pedidoId);
    
    for (const img of imagenes) {
      const filePath = path.join(process.cwd(), 'public', img.ruta_imagen);
      try {
        await unlink(filePath);
      } catch (err) {
        // Ignorar si el archivo físico ya no existía en el disco
      }
    }

    // 2. Ejecutar la eliminación relacional completa bajo una transacción segura
    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM pedido_productos WHERE pedido_id = ?').run(pedidoId);
      db.prepare('DELETE FROM pedido_imagenes WHERE pedido_id = ?').run(pedidoId);
      db.prepare('DELETE FROM pedidos WHERE id = ?').run(pedidoId);
    });

    deleteTransaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
