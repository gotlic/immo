import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const paiement = await prisma.paiement.update({
    where: { id: Number(id) },
    data: body,
  });
  return NextResponse.json(paiement);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.paiement.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
