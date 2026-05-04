import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { randomUUID } from "crypto";

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const bail = await prisma.bail.findUnique({
    where: { token },
    include: {
      appartement: {
        select: {
          titre: true, adresse: true, ville: true, etage: true,
          surface: true, nbPieces: true,
          loyer: true, montantCharges: true, detailCharges: true,
          dpePdf: true, typeChauffage: true, courExtVegetalisee: true,
          loyerPrecedentLocataire: true, coutEnergMensuel: true,
          inventaire: {
            select: {
              dateEntree: true, lignes: true,
              remarqueCuisine: true, remarqueSDB: true,
              remarquePiece: true, remarqueGeneral: true,
            },
          },
        },
      },
    },
  });
  if (!bail) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(bail);
}

/** PUT avec action:
 *  - "submit_info" : le locataire soumet ses infos (sans signer) → info_submitted
 *  - "sign"        : le locataire signe le bail → signed_tenant (nécessite status=caution_signed)
 *  Legacy (sans action) : compatibilité — signe directement si pending (pour tests BO)
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const bail = await prisma.bail.findUnique({ where: { token } });
  if (!bail) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const data = await req.json();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "inconnue";

  const action: string = data.action ?? "submit_info";

  /* ── Étape 1 : soumission des infos locataire + envoi email garant ── */
  if (action === "submit_info") {
    if (bail.status !== "pending") {
      return NextResponse.json({ error: "Ce formulaire a déjà été soumis." }, { status: 409 });
    }

    const garantToken = randomUUID();

    const updated = await prisma.bail.update({
      where: { token },
      data: {
        prenomNom:            data.prenomNom,
        dateNaissance:        data.dateNaissance,
        villeNaissance:       data.villeNaissance,
        departementNaissance: data.departementNaissance,
        adresseLocataire:     data.adresseLocataire,
        tel:              data.tel,
        mailLocataire:    data.mailLocataire,
        garantCivilite:   data.garantCivilite,
        garantPrenomNom:  data.garantPrenomNom,
        garantDateNaissance: data.garantDateNaissance,
        garantAdresse:    data.garantAdresse,
        garantEmail:      data.garantEmail,
        garantToken,
        status:           "info_submitted",
      },
    });

    // Envoi email garant
    if (data.garantEmail) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      const lienCaution = `${baseUrl}/caution/${garantToken}`;
      const lienBail = `${baseUrl}/bail/${token}/view?from=garant`;
      try {
        await sendMail({
          to: data.garantEmail,
          subject: `Acte de cautionnement solidaire — ${data.prenomNom ?? "votre protégé(e)"}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
              <h2 style="color: #1a1a1a;">Acte de cautionnement à signer</h2>
              <p>Bonjour ${data.garantPrenomNom ?? ""},</p>
              <p>
                <strong>${data.prenomNom ?? "Un locataire"}</strong> vous a désigné(e) comme caution solidaire
                pour son contrat de location.
              </p>
              <p>
                Vous pouvez consulter le contrat de location complet avant de signer l'acte de cautionnement :
              </p>
              <p style="text-align: center; margin: 16px 0;">
                <a href="${lienBail}"
                  style="background: #f3f4f6; color: #374151; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; border: 1px solid #d1d5db;">
                  📄 Voir le bail complet
                </a>
              </p>
              <p>
                Puis, veuillez lire et signer l'acte de cautionnement solidaire :
              </p>
              <p style="text-align: center; margin: 16px 0;">
                <a href="${lienCaution}"
                  style="background: #1a1a1a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  Lire et signer l'acte de cautionnement →
                </a>
              </p>
              <p style="font-size: 12px; color: #666;">
                Si les boutons ne fonctionnent pas, copiez ces liens dans votre navigateur :<br/>
                Bail : <a href="${lienBail}">${lienBail}</a><br/>
                Acte de caution : <a href="${lienCaution}">${lienCaution}</a>
              </p>
              <p style="font-size: 11px; color: #999; margin-top: 24px;">
                En signant l'acte de cautionnement, vous vous portez caution solidaire conformément à l'article 22-1
                de la loi n° 89-462 du 6 juillet 1989.
              </p>
            </div>
          `,
        });
      } catch (err) {
        console.error("[bail PUT submit_info] Email garant failed:", err);
        // Non-bloquant — on continue
      }
    }

    return NextResponse.json({ ...updated, garantTokenSent: true });
  }

  /* ── Étape 2 : signature du bail par le locataire ── */
  if (action === "sign") {
    if (bail.status !== "caution_signed") {
      return NextResponse.json(
        { error: "L'acte de cautionnement n'a pas encore été signé par votre garant." },
        { status: 409 }
      );
    }
    if (!data.signature) {
      return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
    }

    const updated = await prisma.bail.update({
      where: { token },
      data: {
        signatureLocataire:   data.signature,
        signatureLocataireAt: new Date().toISOString(),
        ipLocataire:          ip,
        status:               "signed_tenant",
      },
      include: { appartement: { select: { titre: true, adresse: true, ville: true } } },
    });

    // Notifier l'admin : garant + locataire ont tous deux signé
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      const lienAdmin = `${baseUrl}/admin`;
      try {
        await sendMail({
          to: adminEmail,
          subject: `✅ Bail signé par le locataire — ${updated.prenomNom ?? "inconnu"} — ${updated.appartement.titre}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
              <h2 style="color: #1a1a1a;">Garant et locataire ont signé</h2>
              <p>Bonjour,</p>
              <p>
                <strong>${updated.prenomNom ?? "Le locataire"}</strong> vient de signer électroniquement le bail
                pour <strong>${updated.appartement.titre}</strong>${updated.appartement.adresse ? ` (${updated.appartement.adresse}${updated.appartement.ville ? `, ${updated.appartement.ville}` : ""})` : ""}.
              </p>
              <ul style="line-height: 1.8;">
                <li>✅ Acte de cautionnement signé par <strong>${updated.garantPrenomNom ?? "le garant"}</strong></li>
                <li>✅ Bail signé par <strong>${updated.prenomNom ?? "le locataire"}</strong></li>
              </ul>
              <p>Il ne reste plus qu'à apposer votre signature de bailleur pour finaliser le document.</p>
              <p style="text-align: center; margin: 24px 0;">
                <a href="${lienAdmin}"
                  style="background: #1a1a1a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  Accéder à l'administration →
                </a>
              </p>
            </div>
          `,
        });
      } catch (err) {
        console.error("[bail PUT sign] Email admin failed:", err);
      }
    }

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
