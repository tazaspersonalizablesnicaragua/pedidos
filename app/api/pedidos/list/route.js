import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  
  // Extraer y limpiar parámetros del frontend
  const query = (searchParams.get('q') || '').trim();
  const fechaIni = (searchParams.get('fecha_ini') || '').trim();
  const fechaFin = (searchParams.get('fecha_fin') || '').trim();
  const tipoFecha = searchParams.get('tipo_fecha') || 'fecha_solicitud';
  const estado = (searchParams.get('estado') || '').trim();
  const page = parseInt(searchParams.get('page'), 10) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    // 1. CONSULTA DE CONTEO TOTAL (Estructura condicional nativa)
    // Usamos variables directas dentro del template. El SDK de SQLite Cloud las convertirá a parámetros seguros.
    let countResult;
    const queryLike = `%${query}%`;
    const columnaFechaValida = tipoFecha === 'fecha_entrega' ? 'fecha_entrega' : 'fecha_solicitud';

    if (query && estado && fechaIni && fechaFin) {
      countResult = await db.sql`SELECT COUNT(*) as total FROM pedidos WHERE (nombre_cliente LIKE ${queryLike} OR telefono LIKE ${queryLike}) AND estado = ${estado} AND ${columnaFechaValida} BETWEEN ${fechaIni} AND ${fechaFin}`;
    } else if (query && estado) {
      countResult = await db.sql`SELECT COUNT(*) as total FROM pedidos WHERE (nombre_cliente LIKE ${queryLike} OR telefono LIKE ${queryLike}) AND estado = ${estado}`;
    } else if (query && fechaIni && fechaFin) {
      countResult = await db.sql`SELECT COUNT(*) as total FROM pedidos WHERE (nombre_cliente LIKE ${queryLike} OR telefono LIKE ${queryLike}) AND ${columnaFechaValida} BETWEEN ${fechaIni} AND ${fechaFin}`;
    } else if (estado && fechaIni && fechaFin) {
      countResult = await db.sql`SELECT COUNT(*) as total FROM pedidos WHERE estado = ${estado} AND ${columnaFechaValida} BETWEEN ${fechaIni} AND ${fechaFin}`;
    } else if (query) {
      countResult = await db.sql`SELECT COUNT(*) as total FROM pedidos WHERE (nombre_cliente LIKE ${queryLike} OR telefono LIKE ${queryLike})`;
    } else if (estado) {
      countResult = await db.sql`SELECT COUNT(*) as total FROM pedidos WHERE estado = ${estado}`;
    } else if (fechaIni && fechaFin) {
      countResult = await db.sql`SELECT COUNT(*) as total FROM pedidos WHERE ${columnaFechaValida} BETWEEN ${fechaIni} AND ${fechaFin}`;
    } else {
      // Caso por defecto (Ej: Tu URL actual sin ningún filtro activo)
      countResult = await db.sql`SELECT COUNT(*) as total FROM pedidos`;
    }

    const rowsCount = Array.isArray(countResult) ? countResult : (countResult.rows || []);
    const totalRecords = rowsCount[0]?.total || 0;


    // 2. CONSULTA DE REGISTROS PAGINADOS
    // Replicamos la misma lógica limpia inyectando de forma directa LIMIT y OFFSET al final
    let pedidosResult;

    if (query && estado && fechaIni && fechaFin) {
      pedidosResult = await db.sql`SELECT * FROM pedidos WHERE (nombre_cliente LIKE ${queryLike} OR telefono LIKE ${queryLike}) AND estado = ${estado} AND ${columnaFechaValida} BETWEEN ${fechaIni} AND ${fechaFin} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (query && estado) {
      pedidosResult = await db.sql`SELECT * FROM pedidos WHERE (nombre_cliente LIKE ${queryLike} OR telefono LIKE ${queryLike}) AND estado = ${estado} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (query && fechaIni && fechaFin) {
      pedidosResult = await db.sql`SELECT * FROM pedidos WHERE (nombre_cliente LIKE ${queryLike} OR telefono LIKE ${queryLike}) AND ${columnaFechaValida} BETWEEN ${fechaIni} AND ${fechaFin} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (estado && fechaIni && fechaFin) {
      pedidosResult = await db.sql`SELECT * FROM pedidos WHERE estado = ${estado} AND ${columnaFechaValida} BETWEEN ${fechaIni} AND ${fechaFin} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (query) {
      pedidosResult = await db.sql`SELECT * FROM pedidos WHERE (nombre_cliente LIKE ${queryLike} OR telefono LIKE ${queryLike}) ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (estado) {
      pedidosResult = await db.sql`SELECT * FROM pedidos WHERE estado = ${estado} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (fechaIni && fechaFin) {
      pedidosResult = await db.sql`SELECT * FROM pedidos WHERE ${columnaFechaValida} BETWEEN ${fechaIni} AND ${fechaFin} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
    } else {
      // Caso por defecto sin filtros (Carga inicial de la app)
      pedidosResult = await db.sql`SELECT * FROM pedidos ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    const pedidosArray = Array.isArray(pedidosResult) ? pedidosResult : (pedidosResult.rows || []);

    return NextResponse.json({
      pedidos: pedidosArray,
      totalPages: Math.ceil(totalRecords / limit) || 1,
      currentPage: page
    });

  } catch (error) {
    console.error("Error en API de listado (SQLite Cloud):", error);
    return NextResponse.json({ error: error.message, pedidos: [] }, { status: 500 });
  }
}