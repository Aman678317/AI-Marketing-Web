import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const connections = await prisma.connection.findMany();
  return NextResponse.json(connections);
}
