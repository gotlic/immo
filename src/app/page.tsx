import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DPE_COLORS: Record<string, string> = {
  A: "bg-green-600",
  B: "bg-green-400",
  C: "bg-yellow-400",
  D: "bg-orange-400",
  E: "bg-orange-500",
  F: "bg-red-500",
  G: "bg-red-700",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const appartements = await prisma.appartement.findMany({
    include: { photos: { orderBy: { ordre: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Hero avec photo de fond ── */}
      <div className="relative">
        {/* Image de fond */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/images/immeuble.jpg"
            alt="Immeuble"
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          {/* Overlay dégradé */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>

        {/* Lien admin discret */}
        <Link
          href="/admin"
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/10 hover:bg-white/25 transition-colors"
          title="Administration"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </Link>

        {/* Contenu du hero */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center text-center gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight drop-shadow">
            Location d&apos;appartements
          </h1>
          <p className="text-white/80 text-base sm:text-lg max-w-xl">
            Lille — Cormontaigne · {appartements.filter((a) => a.disponible).length} bien{appartements.filter((a) => a.disponible).length > 1 ? "s" : ""} disponible{appartements.filter((a) => a.disponible).length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Grille des appartements ── */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-10">
          {appartements.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">Aucun appartement disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {appartements.map((appart) => (
                <Link key={appart.id} href={`/appartements/${appart.id}`}>
                  <article className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="relative h-52 bg-gray-100">
                      {appart.photos[0] ? (
                        <Image
                          src={appart.photos[0].url}
                          alt={appart.titre}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          unoptimized={appart.photos[0].url.startsWith("/uploads/")}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-300 text-4xl">
                          🏠
                        </div>
                      )}
                      {!appart.disponible && (
                        <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm bg-gray-800 px-3 py-1 rounded-full">
                            Loué
                          </span>
                        </div>
                      )}
                      {appart.dpeClasse && (
                        <span
                          className={`absolute top-3 right-3 text-white text-xs font-bold px-2 py-1 rounded ${DPE_COLORS[appart.dpeClasse] ?? "bg-gray-500"}`}
                        >
                          DPE {appart.dpeClasse}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h2 className="font-semibold text-gray-900 truncate">{appart.titre}</h2>
                      {appart.ville && (
                        <p className="text-sm text-gray-500 mt-0.5">{appart.ville}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-sm text-gray-600">
                        <span>{appart.surface} m²</span>
                        <span className="text-gray-300">·</span>
                        <span>
                          {appart.nbPieces} pièce{appart.nbPieces > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="mt-3 space-y-0.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-gray-900">
                            {appart.loyer.toLocaleString("fr-FR")} €
                          </span>
                          <span className="text-sm text-gray-500">HC/mois</span>
                        </div>
                        {appart.montantCharges !== null && (
                          <p className="text-xs text-gray-400">
                            {(appart.loyer + appart.montantCharges).toLocaleString("fr-FR")} € CC/mois
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
