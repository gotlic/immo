#!/bin/bash
set -e

echo "🚀 Déploiement site_immo sur o2switch..."

SSH_USER="liga1281"
SSH_HOST="immo.lictevout.com"

ssh "$SSH_USER@$SSH_HOST" bash << 'EOF'
  set -e

  REMOTE_DIR=~/site_immo
  NODEVENV=~/nodevenv/site_immo/20

  # Activer Node 20 (nodevenv Cloudlinux)
  source "$NODEVENV/bin/activate"

  cd "$REMOTE_DIR"

  echo "📥 Git pull..."
  git pull origin main

  # ⚠️  NE PAS faire npm install ici.
  #     node_modules est un symlink vers $NODEVENV/lib/node_modules (Cloudlinux).
  #     npm install depuis la racine du projet casse le symlink.
  #     Pour ajouter un package : utiliser le script Python tarball (voir README).

  echo "🗃️  Prisma generate + migrate..."
  npx prisma generate
  npx prisma migrate deploy

  echo "🔨 Build Next.js (webpack — Turbopack incompatible avec nodevenv)..."
  node_modules/.bin/next build --webpack

  echo "🔄 Redémarrage Passenger..."
  mkdir -p tmp && touch tmp/restart.txt

  echo "✅ Déploiement terminé !"
EOF
