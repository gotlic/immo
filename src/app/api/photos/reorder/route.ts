import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/photos/reorder
// Body: [{ id: number, ordre: number }, ...]
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const items: { id: number; ordre: number }[] = await req.json();
    await Promise.all(
      items.map(({ id, ordre }) =>
        prisma.photo.update({ where: { id }, data: { ordre } })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/photos/reorder]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
