import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID de pedido requerido' }, { status: 400 });
  }

  try {
    // 1. Obtener los datos generales del pedido
    // Usamos la sintaxis limpia de acentos graves nativa de SQLite Cloud
    const pedidoResult = await db.sql`SELECT * FROM pedidos WHERE id = ${id}`;
    
    // SQLite Cloud devuelve un array de registros. Obtenemos el primero.
    const rowsPedido = Array.isArray(pedidoResult) ? pedidoResult : (pedidoResult.rows || []);
    const pedido = rowsPedido[0];
    
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // 2. Obtener los productos asociados
    const productosResult = await db.sql`SELECT * FROM pedido_productos WHERE pedido_id = ${id}`;
    const productos = Array.isArray(productosResult) ? productosResult : (productosResult.rows || []);
    
    // 3. Obtener las imágenes asociadas
    const imagenesResult = await db.sql`SELECT * FROM pedido_imagenes WHERE pedido_id = ${id}`;
    const imagenes = Array.isArray(imagenesResult) ? imagenesResult : (imagenesResult.rows || []);

    // 4. Retornar la estructura unificada idéntica a como la espera tu Frontend
    return NextResponse.json({ 
      ...pedido, 
      productos,
      imagenes 
    });
  } catch (error) {
    console.error("Error al obtener detalle del pedido (SQLite Cloud):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
