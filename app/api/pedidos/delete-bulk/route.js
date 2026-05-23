import db from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// Ejemplo rápido en tu API Route
export async function POST(request) {
  try {
    // 1. Validar el cuerpo de la petición
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron IDs válidos para procesar.' },
        { status: 400 }
      );
    }

    // 3. Obtener las rutas de imágenes antes de borrar los registros
    // SQLite Cloud utiliza placeholders numerados o estándar (?1, ?2 o ? simples dependiendo de la versión del driver)
    const placeholders = ids.map(() => '?').join(',');

    const rowsItems = await db.sql(
      `SELECT ruta_imagen FROM pedido_imagenes WHERE pedido_id IN (${placeholders})`,
      ...ids
    );

    /*
    const rowsPedidos = await db.sql(
      `SELECT archivo_adjunto FROM pedidos WHERE id IN (${placeholders})`,
      ...ids
    );
    */

    // 4. EJECUTAR ELIMINACIÓN EN CASCADA DENTRO DE UNA TRANSACCIÓN SQL
    // SQLite maneja las transacciones mediante comandos directos BEGIN TRANSACTION y COMMIT
    await db.sql('BEGIN TRANSACTION');

    try {
      // Primero eliminamos los productos (pedido_productos) vinculados
      await db.sql(`DELETE FROM pedido_productos WHERE pedido_id IN (${placeholders})`, ...ids);

      // Segundo, eliminamos los pedidos principales
      await db.sql(`DELETE FROM pedidos WHERE id IN (${placeholders})`, ...ids);

      // Si todo sale bien, confirmamos los cambios en SQLite Cloud
      await db.sql('COMMIT');
    } catch (transactionError) {
      // Si falla cualquier consulta interna, hacemos rollback inmediatamente
      await db.sql('ROLLBACK');
      throw transactionError;
    }

    // 5. ELIMINACIÓN FÍSICA DE ARCHIVOS MULTIMEDIA EN EL DISCO LOCAL
    const archivosAEliminar = [];

    if (rowsItems && Array.isArray(rowsItems)) {
      rowsItems.forEach((item) => {
        if (item.imagen_url) {
          archivosAEliminar.push(item.imagen_url);
        }
      });
    }


    /*
    if (rowsPedidos && Array.isArray(rowsPedidos)) {
      rowsPedidos.forEach((pedido) => {
        if (pedido.archivo_adjunto) archivosAEliminar.push(pedido.archivo_adjunto);
      });
    }
    */

    // Procesar remoción de los archivos físicos de la carpeta /public
    for (const rutaRelativa of archivosAEliminar) {
      try {
        if (!url) {
          throw new Error('A valid blob URL is required');
        }

        try {
          // Pass the absolute file URL (e.g., "https://xyz.public.blob.vercel-storage.com/image.jpg")
          await del(rutaRelativa);
        } catch(fileError) {
        // Ignoramos silenciosamente si el archivo ya no existía físicamente en el disco
        console.warn(`No se pudo eliminar el archivo físico: ${rutaRelativa}`);
        }
      } catch(e)  {
      }
    }

      return NextResponse.json({
        success: true,
        message: `Se eliminaron con éxito las órdenes seleccionadas y sus archivos vinculados de SQLite Cloud.`,
        affectedRows: ids.length
      });
  
    } catch(error) {
      console.error('Fallo crítico en el endpoint de borrado masivo (SQLite Cloud):', error);

      return NextResponse.json(
        { 
          success: false, 
          error: 'Error interno del servidor al procesar la eliminación en SQLite Cloud.',
          details: error.message 
        },
        { status: 500 }
      );
  } finally {
    // El SDK de SQLite Cloud cierra las conexiones automáticamente al finalizar la ejecución del script en entornos Serverless,
    // pero si usas conexiones persistentes, asegúrate de mantener actualizado tu string de conexión.
  }
}