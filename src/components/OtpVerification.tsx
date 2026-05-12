"use client";

import { useState } from "react";

interface Props {
  /** Type de document : "bail" | "caution" — extensible */
  documentType: "bail" | "caution";
  /** Token du document (bail.token ou bail.garantToken) */
  token: string;
  /** Rôle du signataire */
  signerRole: "locataire" | "garant";
  /** Appelé avec le sessionToken une fois l'identité vérifiée */
  onVerified: (sessionToken: string) => void;
  /** Classe CSS additionnelle */
  className?: string;
}

type Phase = "idle" | "sending" | "code_sent" | "verifying" | "verified";

/**
 * OtpVerification — composant générique de vérification d'identité par email.
 *
 * Utilisable pour tout document nécessitant une confirmation OTP.
 * Usage:
 *   <OtpVerification
 *     documentType="bail"
 *     token={bail.token}
 *     signerRole="locataire"
 *     onVerified={(sessionToken) => setOtpSession(sessionToken)}
 *   />
 */
export default function OtpVerification({
  documentType,
  token,
  signerRole,
  onVerified,
  className = "",
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function handleSend() {
    setPhase("sending");
    setError("");
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, token, signerRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'envoi");
      setSessionToken(data.sessionToken);
      setMaskedEmail(data.maskedEmail);
      setPhase("code_sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setPhase("idle");
    }
  }

  async function handleVerify() {
    if (!code.trim() || code.trim().length !== 6) {
      setError("Le code doit contenir 6 chiffres."); return;
    }
    setPhase("verifying");
    setError("");
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la vérification");
      setPhase("verified");
      onVerified(sessionToken!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setPhase("code_sent");
    }
  }

  // ── Déjà vérifié ──────────────────────────────────────────────────────────
  if (phase === "verified") {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 ${className}`}>
        <span className="text-lg">✅</span>
        <span>Identité vérifiée par email — vous pouvez signer.</span>
      </div>
    );
  }

  // ── Phase initiale : bouton d'envoi ───────────────────────────────────────
  if (phase === "idle" || phase === "sending") {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
          <p className="font-medium mb-1">🔐 Vérification d'identité requise</p>
          <p className="text-blue-600 text-xs">
            Avant de signer, nous allons envoyer un code à 6 chiffres à votre adresse email pour confirmer votre identité.
          </p>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={handleSend}
          disabled={phase === "sending"}
          className="w-full border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {phase === "sending" ? "Envoi en cours…" : "📧 Recevoir mon code de confirmation par email"}
        </button>
      </div>
    );
  }

  // ── Code envoyé : saisie ──────────────────────────────────────────────────
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
        <p className="font-medium text-amber-800 mb-0.5">📧 Code envoyé à <span className="font-mono">{maskedEmail}</span></p>
        <p className="text-amber-600 text-xs">Vérifiez votre boîte mail (et les spams). Valable 10 minutes.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Code à 6 chiffres</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.length === 6) handleVerify();
          }}
          placeholder="123456"
          className="w-full text-center text-2xl font-bold tracking-widest border border-gray-300 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-gray-400"
          autoFocus
        />
      </div>

      {error && <p className="text-xs text-red-600 text-center">{error}</p>}

      <button
        onClick={handleVerify}
        disabled={phase === "verifying" || code.length !== 6}
        className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
      >
        {phase === "verifying" ? "Vérification…" : "Confirmer le code →"}
      </button>

      <button
        onClick={() => { setCode(""); setError(""); setPhase("idle"); }}
        className="w-full text-xs text-gray-400 hover:text-gray-600 underline"
      >
        Renvoyer un nouveau code
      </button>
    </div>
  );
}
