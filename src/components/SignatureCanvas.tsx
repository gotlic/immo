"use client";

import { useRef } from "react";
import SignaturePad, { SignaturePadHandle } from "@/components/SignaturePad";

type Props = {
  onSign: (dataUrl: string) => void;
  onCancel: () => void;
  loading?: boolean;
};

export default function SignatureCanvas({ onSign, onCancel, loading }: Props) {
  const padRef = useRef<SignaturePadHandle>(null);

  function handleConfirm() {
    if (!padRef.current || padRef.current.isEmpty()) return;
    onSign(padRef.current.toDataURL());
  }

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden" style={{ height: 160 }}>
        <SignaturePad ref={padRef} disabled={loading} />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Signature en cours…" : "✅ Confirmer la signature"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
      </div>
      <button
        type="button"
        onClick={() => padRef.current?.clear()}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        ✕ Effacer
      </button>
    </div>
  );
}
