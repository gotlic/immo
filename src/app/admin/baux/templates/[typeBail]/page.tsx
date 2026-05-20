"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BailDocument from "@/components/BailDocument";
import { getBailTypeLabel } from "@/lib/bail-types";

// Données vides — le templateMode affiche les <<CHAMPS>> à la place des valeurs
const EMPTY_DATA = {
  adresse: null, ville: null, etage: null,
  surface: 0, nbPieces: 0,
  loyer: 0, montantCharges: null, detailCharges: null,
  dateDebut: null, irlTrimestre: null, irlValeur: null,
  loyerReference: null, loyerReferenceMaj: null,
  prenomNom: null, dateNaissance: null,
  villeNaissance: null, departementNaissance: null,
  adresseLocataire: null, tel: null, mailLocataire: null,
  garantCivilite: null, garantPrenomNom: null,
  garantDateNaissance: null, garantAdresse: null,
  typeChauffage: null, courExtVegetalisee: false,
  loyerPrecedentLocataire: null, coutEnergMensuel: null, pdl: null,
  dpePdf: null, inventaire: null, cautionData: null,
  garantLieu: null, signatureCaution: null, signatureCautionAt: null,
};

type Mode = "view" | "edit";

export default function BailTemplatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { typeBail } = useParams<{ typeBail: string }>();

  const [mode, setMode] = useState<Mode>("view");
  const [savedHtml, setSavedHtml] = useState<string | null>(null);
  const [hasLocalSave, setHasLocalSave] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);
  const renderRef = useRef<HTMLDivElement>(null);

  const storageKey = `bail-template-html-${typeBail}`;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setSavedHtml(saved);
      setHasLocalSave(true);
    }
  }, [storageKey]);

  function handleEdit() {
    // Capture le HTML rendu actuellement et passe en mode édition
    const html = renderRef.current?.innerHTML ?? "";
    setMode("edit");
    // On positionne le contenu dans le div contentEditable via useEffect
    setTimeout(() => {
      if (editRef.current) {
        editRef.current.innerHTML = html;
        editRef.current.focus();
      }
    }, 50);
  }

  function handleSave() {
    const html = editRef.current?.innerHTML ?? "";
    localStorage.setItem(storageKey, html);
    setSavedHtml(html);
    setHasLocalSave(true);
    setMode("view");
  }

  function handleCancel() {
    setMode("view");
  }

  function handleReset() {
    if (!confirm("Supprimer les modifications sauvegardées et revenir au modèle par défaut ?")) return;
    localStorage.removeItem(storageKey);
    setSavedHtml(null);
    setHasLocalSave(false);
    setMode("view");
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>;
  }
  if (!session) return null;

  const label = getBailTypeLabel(typeBail);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barre d'actions */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700 font-medium">Back office</Link><span className="text-gray-300">/</span><button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700">← Retour</button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">
            Modèle — {label}
          </span>

          <div className="ml-auto flex gap-2 items-center flex-wrap">
            {mode === "view" && (
              <>
                {hasLocalSave && (
                  <>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                      ✏️ Version modifiée
                    </span>
                    <button
                      onClick={handleReset}
                      className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-colors"
                    >
                      Réinitialiser
                    </button>
                  </>
                )}
                {!hasLocalSave && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                    📄 Modèle avec champs variables
                  </span>
                )}
                <button
                  onClick={handleEdit}
                  className="text-sm border border-gray-300 hover:border-gray-500 text-gray-700 px-4 py-1.5 rounded-lg font-medium transition-colors"
                >
                  ✏️ Éditer
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  🖨 Imprimer / PDF
                </button>
              </>
            )}

            {mode === "edit" && (
              <>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                  Mode édition — cliquez dans le document pour modifier
                </span>
                <button
                  onClick={handleCancel}
                  className="text-sm border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="text-sm bg-green-700 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
                >
                  💾 Sauvegarder
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 print:p-0 print:max-w-none">

        {/* Mode édition : div contentEditable */}
        {mode === "edit" && (
          <div
            ref={editRef}
            contentEditable
            suppressContentEditableWarning
            className="outline-none ring-2 ring-orange-300 rounded-xl"
            style={{ minHeight: "200px" }}
          />
        )}

        {/* Mode consultation */}
        {mode === "view" && (
          <div ref={renderRef}>
            {savedHtml ? (
              /* Affiche la version éditée sauvegardée */
              <div dangerouslySetInnerHTML={{ __html: savedHtml }} />
            ) : (
              /* Affiche le modèle React en mode template (champs <<>> oranges) */
              <BailDocument typeBail={typeBail} data={EMPTY_DATA} templateMode={true} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
