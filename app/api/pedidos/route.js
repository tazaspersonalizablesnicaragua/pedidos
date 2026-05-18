import db from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    
    // Extraer campos básicos
    const id = formData.get('id'); // Para auto-guardado/actualización
    const nombre_cliente = formData.get('nombre_cliente');
    const telefono = formData.get('telefono');
    const fecha_solicitud = formData.get('fecha_solicitud');
    const fecha_entrega = formData.get('fecha_entrega');
    const notificar_entrega = formData.get('notificar_entrega') === 'true';
    const requiere_envio = formData.get('requiere_envio') === 'true';
    const direccion_envio = formData.get('direccion_envio');
    const notas = formData.get('notas');
    const estado = formData.get('estado');
    const grand_total = parseFloat(formData.get('grand_total') || '0');
    
    // Extraer productos (vienen como string JSON)
    const productos = JSON.parse(formData.get('productos') || '[]');
    
    // Extraer archivos
    const files = formData.getAll('images');

    let pedidoId = id;

    // Iniciar transacción en la base de datos
    const upsertPedido = db.batch(() => {
      if (pedidoId && pedidoId !== 'null') {
        const update = db.prepare(`
          UPDATE pedidos SET 
          nombre_cliente = ?, telefono = ?, fecha_solicitud = ?, fecha_entrega = ?, 
          notificar_entrega = ?, requiere_envio = ?, direccion_envio = ?, notas = ?, grand_total = ?, estado = ?
          WHERE id = ?
        `);
        update.run(nombre_cliente, telefono, fecha_solicitud, fecha_entrega, 
                   notificar_entrega ? 1 : 0, requiere_envio ? 1 : 0, 
                   direccion_envio, notas, grand_total, estado, pedidoId);
      } else {
        const insert = db.prepare(`
          INSERT INTO pedidos (nombre_cliente, telefono, fecha_solicitud, fecha_entrega, notificar_entrega, requiere_envio, direccion_envio, notas, estado, grand_total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = insert.run(nombre_cliente, telefono, fecha_solicitud, fecha_entrega, 
                                  notificar_entrega ? 1 : 0, requiere_envio ? 1 : 0, 
                                  direccion_envio, notas, estado, grand_total);
        pedidoId = result.lastInsertRowid;
      }

      // Sincronizar productos
      db.prepare('DELETE FROM pedido_productos WHERE pedido_id = ?').run(pedidoId);
      const insertProd = db.prepare('INSERT INTO pedido_productos (pedido_id, nombre, precio_unidad, cantidad, total) VALUES (?, ?, ?, ?, ?)');
      for (const p of productos) {
        insertProd.run(pedidoId, p.nombre, p.precio_unidad, p.cantidad, p.total);
      }
      
      return pedidoId;
    });

    const finalId = upsertPedido();

    // Manejo de archivos físicos
    if (files.length > 0 && files[0] instanceof File) {
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      // Asegurar que la carpeta exista
      await mkdir(uploadDir, { recursive: true });

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${file.name}`;
        const uploadPath = path.join(uploadDir, filename);
        
        await writeFile(uploadPath, buffer);
        
        // Guardar ruta en la BD
        db.prepare('INSERT INTO pedido_imagenes (pedido_id, ruta_imagen) VALUES (?, ?)')
          .run(finalId, `/uploads/${filename}`);
      }
    }

    return NextResponse.json({ success: true, id: finalId });
  } catch (error) {
    console.error("Error en el servidor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
