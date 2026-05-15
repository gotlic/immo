CREATE TABLE "Paiement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bailId" INTEGER NOT NULL,
    "mois" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'attendu',
    "datePaiement" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Paiement_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Paiement_bailId_mois_key" ON "Paiement"("bailId", "mois");
