import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID de pedido requerido' }, { status: 400 });
  }

  try {
    // Obtener los datos generales del pedido
    const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
    
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Obtener los productos asociados
    const productos = db.prepare('SELECT * FROM pedido_productos WHERE pedido_id = ?').all(id);
    
    // Obtener las imágenes asociadas
    const imagenes = db.prepare('SELECT * FROM pedido_imagenes WHERE pedido_id = ?').all(id);

    return NextResponse.json({ 
      ...pedido, 
      productos,
      imagenes 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
