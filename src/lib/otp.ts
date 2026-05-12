import { createHash } from "crypto";
import { randomUUID } from "crypto";

/** Génère un code OTP à 6 chiffres */
export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Hash SHA-256 du code (stocké en DB, jamais le code brut) */
export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Token de session unique retourné au client après envoi de l'OTP */
export function generateSessionToken(): string {
  return randomUUID();
}

/** Masque une adresse email pour l'affichage : marie.dupont@gmail.com → m***.d*****@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  const parts = local.split(".");
  const masked = parts.map((p) =>
    p.length <= 1 ? p : `${p[0]}${"*".repeat(p.length - 1)}`
  );
  return `${masked.join(".")}@${domain}`;
}

/** Template HTML de l'email OTP */
export function buildOtpEmailHtml(code: string, signerRole: string): string {
  const roleLabel = signerRole === "garant" ? "l'acte de cautionnement" : "le contrat de location";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px;">
      <h2 style="color: #1a1a1a; margin-bottom: 8px;">Code de confirmation de signature</h2>
      <p style="color: #444; margin-bottom: 20px;">
        Vous avez demandé à signer électroniquement <strong>${roleLabel}</strong>.<br/>
        Utilisez le code ci-dessous pour confirmer votre identité :
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <span style="
          display: inline-block;
          font-size: 38px;
          font-weight: bold;
          letter-spacing: 10px;
          color: #1a1a1a;
          background: #f3f4f6;
          padding: 14px 28px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
        ">${code}</span>
      </div>
      <p style="color: #666; font-size: 13px; margin-bottom: 6px;">
        ⏱ Ce code est valable <strong>10 minutes</strong>.
      </p>
      <p style="color: #999; font-size: 12px;">
        Si vous n'avez pas demandé ce code, ignorez cet email — aucune action n'est requise.
      </p>
    </div>
  `;
}
