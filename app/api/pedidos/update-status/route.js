import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(req) {
  try {
    const { id, estado } = await req.json();

    if (!id || !estado) {
      return NextResponse.json({ error: 'Datos insuficientes' }, { status: 400 });
    }

    const update = db.prepare('UPDATE pedidos SET estado = ? WHERE id = ?');
    update.run(estado, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
