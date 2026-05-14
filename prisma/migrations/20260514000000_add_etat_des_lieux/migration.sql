-- CreateTable
CREATE TABLE "EtatDesLieux" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "inventaireId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "date" TEXT,
    "lignes" TEXT NOT NULL DEFAULT '[]',
    "photos" TEXT NOT NULL DEFAULT '[]',
    "remarqueCuisine" TEXT,
    "remarqueSDB" TEXT,
    "remarquePiece" TEXT,
    "remarqueGeneral" TEXT,
    "locataireNom" TEXT,
    "locataireEmail" TEXT,
    "signatureBailleur" TEXT,
    "signatureBailleurAt" TEXT,
    "signatureLocataire" TEXT,
    "signatureLocataireAt" TEXT,
    "signatureLocataireIp" TEXT,
    "pdfUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EtatDesLieux_inventaireId_fkey" FOREIGN KEY ("inventaireId") REFERENCES "Inventaire" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EtatDesLieuxOtp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionToken" TEXT NOT NULL,
    "etatDesLieuxId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EtatDesLieuxOtp_etatDesLieuxId_fkey" FOREIGN KEY ("etatDesLieuxId") REFERENCES "EtatDesLieux" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EtatDesLieux_token_key" ON "EtatDesLieux"("token");

-- CreateIndex
CREATE UNIQUE INDEX "EtatDesLieuxOtp_sessionToken_key" ON "EtatDesLieuxOtp"("sessionToken");
