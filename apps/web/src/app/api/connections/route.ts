import { NextResponse } from 'next/server';
import { withDb } from '@/lib/prisma';

export async function GET() {
  const connections = await withDb(
    (db) => db.connection.findMany(),
    [] // DB unavailable — empty list instead of a 500.
  );
  return NextResponse.json(connections);
}
