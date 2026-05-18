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
    const notificar_entrega = formData.get('notificar_entrega') === 'true' ? 1 : 0;
    const requiere_envio = formData.get('requiere_envio') === 'true' ? 1 : 0;
    const direccion_envio = formData.get('direccion_envio');
    const notas = formData.get('notas');
    const estado = formData.get('estado');
    const grand_total = parseFloat(formData.get('grand_total') || '0');
    
    // Extraer productos (vienen como string JSON)
    const productos = JSON.parse(formData.get('productos') || '[]');
    
    // Extraer archivos
    const files = formData.getAll('images');

    let finalId = id;

    // --- TRANSACCIÓN EN SQLITE CLOUD ---
    // Iniciamos de forma asíncrona un bloque estructurado de transacciones
    await db.sql`BEGIN IMMEDIATE TRANSACTION;`;

    try {
      if (finalId && finalId !== 'null') {
        // Operación de Actualización (Update)
        await db.sql`
          UPDATE pedidos SET 
          nombre_cliente = ${nombre_cliente}, telefono = ${telefono}, fecha_solicitud = ${fecha_solicitud}, fecha_entrega = ${fecha_entrega}, 
          notificar_entrega = ${notificar_entrega}, requiere_envio = ${requiere_envio}, direccion_envio = ${direccion_envio}, notas = ${notas}, grand_total = ${grand_total}, estado = ${estado}
          WHERE id = ${finalId}
        `;
      } else {
        // Operación de Inserción (Insert)
        // SQLite Cloud devuelve información del comando ejecutado. El ID insertado está en el metadata.
        const insertResult = await db.sql`
          INSERT INTO pedidos (nombre_cliente, telefono, fecha_solicitud, fecha_entrega, notificar_entrega, requiere_envio, direccion_envio, notas, estado, grand_total)
          VALUES (${nombre_cliente}, ${telefono}, ${fecha_solicitud}, ${fecha_entrega}, ${notificar_entrega}, ${requiere_envio}, ${direccion_envio}, ${notas}, ${estado}, ${grand_total})
        `;
        
        // El driver guarda el ID autogenerado bajo las propiedades de metadata correspondientes
        finalId = insertResult.lastID || insertResult.insertId;
      }

      // Sincronizar sub-productos del pedido
      await db.sql`DELETE FROM pedido_productos WHERE pedido_id = ${finalId}`;
      
      for (const p of productos) {
        await db.sql`
          INSERT INTO pedido_productos (pedido_id, nombre, precio_unidad, cantidad, total) 
          VALUES (${finalId}, ${p.nombre}, ${p.precio_unidad}, ${p.cantidad}, ${p.total})
        `;
      }

      // Si todo lo de la BD sale bien hasta aquí, guardamos cambios permanentemente en la nube
      await db.sql`COMMIT;`;
    } catch (dbError) {
      // Si algo falla dentro del bloque SQL, cancelamos los cambios para no dejar datos corruptos
      await db.sql`ROLLBACK;`;
      throw dbError;
    }

    // --- MANEJO DE ARCHIVOS FÍSICOS (Correrá solo si la BD aceptó la transacción) ---
    if (files.length > 0 && files[0] instanceof File) {
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await mkdir(uploadDir, { recursive: true });

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${file.name}`;
        const uploadPath = path.join(uploadDir, filename);
        
        await writeFile(uploadPath, buffer);
        
        // Guardar ruta de la imagen en SQLite Cloud de forma directa
        await db.sql`
          INSERT INTO pedido_imagenes (pedido_id, ruta_imagen) 
          VALUES (${finalId}, ${`/uploads/${filename}`})
        `;
      }
    }

    return NextResponse.json({ success: true, id: finalId });
  } catch (error) {
    console.error("Error en el servidor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}