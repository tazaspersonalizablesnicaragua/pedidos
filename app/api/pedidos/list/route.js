import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  
  // Parámetros de búsqueda y filtros
  const query = searchParams.get('q') || '';
  const fechaIni = searchParams.get('fecha_ini');
  const fechaFin = searchParams.get('fecha_fin');
  const tipoFecha = searchParams.get('tipo_fecha') || 'fecha_solicitud'; // fecha_solicitud o fecha_entrega
  const estado = searchParams.get('estado') || '';
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    let sql = `SELECT * FROM pedidos WHERE (nombre_cliente LIKE ? OR telefono LIKE ?)`;
    let params = [`%${query}%`, `%${query}%`];

    if (estado) {
      sql += ` AND estado = ?`;
      params.push(estado);
    }

    if (fechaIni && fechaFin) {
      sql += ` AND ${tipoFecha} BETWEEN ? AND ?`;
      params.push(fechaIni, fechaFin);
    }

    // Obtener total para paginación
    const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
    const totalRecords = db.prepare(countSql).get(...params).total;

    // Obtener registros paginados
    sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const pedidos = db.prepare(sql).all(...params);

    return NextResponse.json({
      pedidos,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
