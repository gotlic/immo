-- CreateTable
CREATE TABLE "Appartement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "surface" REAL NOT NULL,
    "nbPieces" INTEGER NOT NULL,
    "etage" INTEGER,
    "loyer" REAL NOT NULL,
    "chargesIncluses" BOOLEAN NOT NULL DEFAULT false,
    "dpeClasse" TEXT,
    "dpePdf" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "specificites" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "appartementId" INTEGER NOT NULL,
    CONSTRAINT "Photo_appartementId_fkey" FOREIGN KEY ("appartementId") REFERENCES "Appartement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Video" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'youtube',
    "appartementId" INTEGER NOT NULL,
    CONSTRAINT "Video_appartementId_fkey" FOREIGN KEY ("appartementId") REFERENCES "Appartement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
