import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(req) {
  try {
    const { id, estado } = await req.json();

    if (!id || !estado) {
      return NextResponse.json({ error: 'Datos insuficientes' }, { status: 400 });
    }

    // Ejecutar la actualización directamente en SQLite Cloud de forma asíncrona
    // El SDK mapea de manera automática y segura los parámetros id y estado
    await db.sql`UPDATE pedidos SET estado = ${estado} WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar estado del pedido (SQLite Cloud):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
