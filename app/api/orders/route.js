import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { fecha, nombre, ruc, items, grandTotal } = await req.json();

  const insertOrder = db.prepare('INSERT INTO orders (fecha, nombre, ruc, grand_total) VALUES (?, ?, ?, ?)');
  const insertItem = db.prepare('INSERT INTO order_items (order_id, producto, cantidad, unidad, precio, total) VALUES (?, ?, ?, ?, ?, ?)');

  const transaction = db.transaction(() => {
    const info = insertOrder.run(fecha, nombre, ruc, grandTotal);
    const orderId = info.lastInsertRowid;
    for (const item of items) {
      insertItem.run(orderId, item.producto, item.cantidad, item.unidad, item.precio, item.total);
    }
  });

  transaction();
  return NextResponse.json({ success: true });
}
