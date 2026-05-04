import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { url, ordre } = await req.json();

  const photo = await prisma.photo.create({
    data: { url, ordre: ordre ?? 0, appartementId: parseInt(id) },
  });
  return NextResponse.json(photo, { status: 201 });
}
