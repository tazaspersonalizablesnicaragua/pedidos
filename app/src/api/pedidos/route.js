import db from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const formData = await req.formData();
  const nombre = formData.get('nombre');
  const telefono = formData.get('telefono');
  const files = formData.getAll('images');

  const insertPedido = db.prepare('INSERT INTO pedidos (cliente_nombre, cliente_telefono) VALUES (?, ?)');
  const insertImg = db.prepare('INSERT INTO pedido_imagenes (pedido_id, ruta_imagen) VALUES (?, ?)');

  const result = insertPedido.run(nombre, telefono);
  const pedidoId = result.lastInsertRowid;

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const filename = `${Date.now()}-${file.name}`;
    const uploadPath = path.join(process.cwd(), 'public/uploads', filename);
    
    await writeFile(uploadPath, buffer);
    insertImg.run(pedidoId, `/uploads/${filename}`);
  }

  return NextResponse.json({ success: true });
}
