import { ImapFlow } from "imapflow";

export interface SumeriaPayment {
  subject: string;
  date: Date;
  amount: number;      // montant en euros (ex: 778.00)
  libelle: string;     // texte entre guillemets dans le corps (ex: "LOYER MENSUEL ANTOINE MONIER")
  compte: string;      // compte crédité (ex: "Compte 4 rue Flamen")
  sender: string;      // nom de l'expéditeur (ex: "MME CHARLOTTE MARIJON")
}

/**
 * Récupère les virements entrants Sumeria sur le "Compte 4 rue Flamen"
 * depuis une date donnée.
 *
 * Nécessite dans .env :
 *   GMAIL_USER=gautier@lictevout.com
 *   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  (mot de passe d'application Google)
 */
export async function fetchSumeriaPayments(since: Date): Promise<SumeriaPayment[]> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("GMAIL_USER et GMAIL_APP_PASSWORD doivent être définis dans .env");
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  await client.connect();
  const payments: SumeriaPayment[] = [];

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      // Recherche : mails de Sumeria depuis la date donnée
      const uids = await client.search({
        from: "sumeria.eu",
        since,
      }, { uid: true });

      if (!uids || (uids as number[]).length === 0) return [];

      for await (const msg of client.fetch(uids as number[], {
        uid: true,
        envelope: true,
        bodyParts: ["TEXT"],
      }, { uid: true })) {
        const subject = msg.envelope?.subject ?? "";

        // Filtrer : seulement les virements reçus (sujet commence par "+")
        if (!subject.startsWith("+")) continue;

        // Parser le montant depuis le sujet : "+ 778,00 € de NOM"
        const subjectMatch = subject.match(/^\+\s*([\d\s]+,\d{2})\s*€/);
        if (!subjectMatch) continue;
        const amount = parseFloat(subjectMatch[1].replace(/\s/g, "").replace(",", "."));

        // Récupérer le body texte
        const bodyPart = msg.bodyParts?.get("text");
        const bodyText = bodyPart ? Buffer.from(bodyPart).toString("utf-8") : "";

        // Filtrer : seulement le "Compte 4 rue Flamen"
        if (!bodyText.includes("Flamen")) continue;

        // Parser le libellé : « LOYER MENSUEL ANTOINE MONIER »
        const libelleMatch = bodyText.match(/pour\s+[«"]\s*([^»"]+?)\s*[»"]/u);
        const libelle = libelleMatch?.[1]?.trim() ?? "";

        // Parser le compte : "crédité sur votre compte « Compte 4 rue Flamen »"
        const compteMatch = bodyText.match(/compte\s+[«"]\s*([^»"]+?)\s*[»"]/u);
        const compte = compteMatch?.[1]?.trim() ?? "";

        // Parser le nom de l'expéditeur depuis le sujet : "+ X € de NOM"
        const senderMatch = subject.match(/€\s+de\s+(.+)$/i);
        const sender = senderMatch?.[1]?.trim() ?? "";

        payments.push({
          subject,
          date: msg.envelope?.date ?? new Date(),
          amount,
          libelle,
          compte,
          sender,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return payments;
}
