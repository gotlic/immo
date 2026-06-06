import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchSumeriaPayments } from "@/lib/gmail-imap";

export type GmailMatch = {
  emailDate: string;
  emailAmount: number;
  emailLibelle: string;
  emailSender: string;
  bailId: number;
  mois: string;            // "YYYY-MM" pour un loyer, "caution" pour un dépôt
  locataire: string;
  expectedMontant: number;
  existingPaiementId: number | null;
  matchType: "loyer" | "caution";
  confidence: "confirmed" | "ambiguous";
  reason?: string;
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const debug = req.nextUrl.searchParams.get("debug") === "1";

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json(
      { error: "GMAIL_USER et GMAIL_APP_PASSWORD ne sont pas configurés dans .env" },
      { status: 503 }
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 60);

  let emails;
  try {
    emails = await fetchSumeriaPayments(since);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Erreur Gmail : ${message}` }, { status: 500 });
  }

  if (emails.length === 0) {
    return NextResponse.json({ confirmed: [], ambiguous: [], noMatch: [], ...(debug ? { debug: { emails: [], baux: [] } } : {}) });
  }

  // Tous les baux actifs
  const baux = await prisma.bail.findMany({
    where: { status: "signed_both", NOT: { archived: true } },
    select: {
      id: true,
      prenomNom: true,
      status: true,
      archived: true,
      dateDebut: true,
      appartement: { select: { loyer: true, montantCharges: true } },
    },
  });

  // Tous les paiements existants (pour déduplication et mise à jour)
  const existingPaiements = await prisma.paiement.findMany({
    select: { id: true, bailId: true, mois: true, statut: true },
  });

  if (debug) {
    return NextResponse.json({
      debug: {
        emails: emails.map(e => ({
          subject: e.subject,
          amount: e.amount,
          sender: e.sender,
          libelle: e.libelle,
          compte: e.compte,
          date: e.date.toISOString(),
        })),
        baux: baux.map(b => ({
          id: b.id,
          prenomNom: b.prenomNom,
          status: b.status,
          archived: b.archived,
          loyer: b.appartement.loyer,
          montantCharges: b.appartement.montantCharges,
          totalCC: (b.appartement.loyer ?? 0) + (b.appartement.montantCharges ?? 0),
        })),
        existingPaiements,
        allBaux: await prisma.bail.findMany({
          select: { id: true, prenomNom: true, status: true, archived: true },
        }),
      },
    });
  }

  const confirmed: GmailMatch[] = [];
  const ambiguous: GmailMatch[] = [];
  const noMatch: GmailMatch[] = [];

  for (const email of emails) {
    // Convertir en heure française (UTC+2 en été) pour déterminer le bon mois
    const frDate = new Date(email.date.getTime() + 2 * 60 * 60 * 1000);
    const targetMois = `${frDate.getUTCFullYear()}-${String(frDate.getUTCMonth() + 1).padStart(2, "0")}`;

    const base = {
      emailDate: email.date.toISOString(),
      emailAmount: email.amount,
      emailLibelle: email.libelle,
      emailSender: email.sender,
    };

    // ── 1. Essai loyer mensuel : montant = loyer + charges ──
    const loyerMatches = baux.filter((b) => {
      const total = (b.appartement.loyer ?? 0) + (b.appartement.montantCharges ?? 0);
      return Math.abs(total - email.amount) < 0.01;
    }).filter((b) => {
      // Ne pas proposer si déjà payé pour ce mois
      const ex = existingPaiements.find((p) => p.bailId === b.id && p.mois === targetMois);
      return !ex || ex.statut !== "paye";
    });

    // ── 2. Essai caution : montant = loyer HC seul ──
    const cautionMatches = baux.filter((b) => {
      const loyer = b.appartement.loyer ?? 0;
      return Math.abs(loyer - email.amount) < 0.01;
    }).filter((b) => {
      // Ne pas proposer si caution déjà payée
      const ex = existingPaiements.find((p) => p.bailId === b.id && p.mois === "caution");
      return !ex || ex.statut !== "paye";
    });

    // ── Décision ──
    // Priorité au match loyer si trouvé sans ambiguïté
    if (loyerMatches.length === 1) {
      const b = loyerMatches[0];
      const ex = existingPaiements.find((p) => p.bailId === b.id && p.mois === targetMois);
      confirmed.push({
        ...base,
        bailId: b.id,
        mois: targetMois,
        locataire: b.prenomNom ?? `Bail #${b.id}`,
        expectedMontant: (b.appartement.loyer ?? 0) + (b.appartement.montantCharges ?? 0),
        existingPaiementId: ex?.id ?? null,
        matchType: "loyer",
        confidence: "confirmed",
      });
      continue;
    }

    if (loyerMatches.length > 1) {
      const b = loyerMatches[0];
      const ex = existingPaiements.find((p) => p.bailId === b.id && p.mois === targetMois);
      ambiguous.push({
        ...base,
        bailId: b.id,
        mois: targetMois,
        locataire: b.prenomNom ?? `Bail #${b.id}`,
        expectedMontant: (b.appartement.loyer ?? 0) + (b.appartement.montantCharges ?? 0),
        existingPaiementId: ex?.id ?? null,
        matchType: "loyer",
        confidence: "ambiguous",
        reason: `${loyerMatches.length} locataires ont le même loyer CC (${email.amount} €)`,
      });
      continue;
    }

    // Pas de match loyer → essai caution
    if (cautionMatches.length === 1) {
      const b = cautionMatches[0];
      const ex = existingPaiements.find((p) => p.bailId === b.id && p.mois === "caution");
      confirmed.push({
        ...base,
        bailId: b.id,
        mois: "caution",
        locataire: b.prenomNom ?? `Bail #${b.id}`,
        expectedMontant: b.appartement.loyer ?? 0,
        existingPaiementId: ex?.id ?? null,
        matchType: "caution",
        confidence: "confirmed",
      });
      continue;
    }

    if (cautionMatches.length > 1) {
      const b = cautionMatches[0];
      const ex = existingPaiements.find((p) => p.bailId === b.id && p.mois === "caution");
      ambiguous.push({
        ...base,
        bailId: b.id,
        mois: "caution",
        locataire: b.prenomNom ?? `Bail #${b.id}`,
        expectedMontant: b.appartement.loyer ?? 0,
        existingPaiementId: ex?.id ?? null,
        matchType: "caution",
        confidence: "ambiguous",
        reason: `${cautionMatches.length} locataires ont le même loyer HC (${email.amount} €)`,
      });
      continue;
    }

    // Aucun match
    noMatch.push({
      ...base,
      bailId: 0,
      mois: emailMois,
      locataire: email.sender,
      expectedMontant: email.amount,
      existingPaiementId: null,
      matchType: "loyer",
      confidence: "ambiguous",
      reason: "Aucun bail actif avec ce montant (loyer CC ou caution)",
    });
  }

  return NextResponse.json({ confirmed, ambiguous, noMatch });
}

/**
 * POST /api/paiements/check-gmail
 * Crée ou met à jour les paiements sélectionnés en "paye".
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { matches } = await req.json() as {
    matches: {
      bailId: number;
      mois: string;
      existingPaiementId: number | null;
      montant: number;
      datePaiement: string;
    }[];
  };

  if (!Array.isArray(matches) || matches.length === 0) {
    return NextResponse.json({ error: "matches requis" }, { status: 400 });
  }

  let updated = 0;
  let created = 0;

  for (const m of matches) {
    if (m.existingPaiementId) {
      await prisma.paiement.update({
        where: { id: m.existingPaiementId },
        data: { statut: "paye", datePaiement: m.datePaiement },
      });
      updated++;
    } else {
      const note = m.mois === "caution" ? "Dépôt de garantie" : undefined;
      await prisma.paiement.create({
        data: {
          bailId: m.bailId,
          mois: m.mois,
          montant: m.montant,
          statut: "paye",
          datePaiement: m.datePaiement,
          ...(note ? { note } : {}),
        },
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, updated, created });
}
