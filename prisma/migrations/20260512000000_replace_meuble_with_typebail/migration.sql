-- Migration : remplace le champ booléen `meuble` par `typeBail` (String)
-- Les appartements marqués meuble=false deviennent typeBail='non_meuble'
-- Tous les autres (meuble=true ou NULL) deviennent typeBail='meuble'

-- Étape 1 : ajouter la nouvelle colonne avec valeur par défaut
ALTER TABLE "Appartement" ADD COLUMN "typeBail" TEXT NOT NULL DEFAULT 'meuble';

-- Étape 2 : migrer les données existantes
UPDATE "Appartement" SET "typeBail" = 'non_meuble' WHERE "meuble" = 0;

-- Note : la colonne `meuble` est conservée en base pour compatibilité ascendante
-- et sera supprimée lors d'une prochaine migration de nettoyage.
