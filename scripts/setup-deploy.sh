#!/usr/bin/env bash
# Configuration complète GitHub + Vercel, en une commande.
#
#   bash scripts/setup-deploy.sh
#
# Conçu pour une machine qui sert à PLUSIEURS comptes : le script bascule sur
# le compte GitHub visé, travaille, puis remet le compte d'origine — même en
# cas d'erreur ou d'interruption (voir le trap plus bas). Côté Vercel, rien
# n'est déconnecté : toutes les commandes passent par --token, donc la session
# Vercel déjà en place sur la machine n'est jamais touchée.
#
# Variables acceptées :
#   GH_ACCOUNT=pseudo     compte GitHub à utiliser (sinon : demandé)
#   REPO_NAME=nom         nom du dépôt (défaut : boite-a-rythmes)
#   VISIBILITY=private    dépôt privé (défaut : public)
#   VERCEL_TOKEN=...      jeton Vercel (sinon : demandé, saisie masquée)
set -euo pipefail

REPO_NAME="${REPO_NAME:-boite-a-rythmes}"
VISIBILITY="${VISIBILITY:-public}"

say()  { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
ok()   { printf '  \033[0;32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[0;33m!\033[0m %s\n' "$1"; }
die()  { printf '\n\033[0;31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------- 1. outils
say "Vérification des outils"
command -v git  >/dev/null || die "git n'est pas installé."
command -v gh   >/dev/null || die "GitHub CLI manquant :  brew install gh"
command -v node >/dev/null || die "Node.js n'est pas installé."
command -v vercel >/dev/null || { warn "CLI Vercel absente, installation…"; npm install --global vercel@latest; }
ok "git, gh, node, vercel"

# ------------------------------------------------- 2. compte GitHub à viser
gh auth status >/dev/null 2>&1 || die "Aucun compte GitHub connecté. Lance :  gh auth login"

PREVIOUS_ACCOUNT=$(gh api user --jq .login)
ACCOUNTS=$(gh auth status 2>&1 | sed -n 's/.*Logged in to github.com account \([^ ]*\).*/\1/p')

say "Compte GitHub"
printf '  Comptes connectés sur cette machine : %s\n' "$(echo "$ACCOUNTS" | tr '\n' ' ')"
printf '  Compte actif actuellement           : %s\n\n' "$PREVIOUS_ACCOUNT"

if [ -z "${GH_ACCOUNT:-}" ]; then
  printf '  Sous quel compte créer le dépôt ? [%s] ' "$PREVIOUS_ACCOUNT"
  read -r GH_ACCOUNT
  GH_ACCOUNT="${GH_ACCOUNT:-$PREVIOUS_ACCOUNT}"
fi

if ! echo "$ACCOUNTS" | grep -qx "$GH_ACCOUNT"; then
  cat <<EOF

  Le compte « $GH_ACCOUNT » n'est pas encore connecté sur cette machine.
  Ajoute-le (la connexion se fait dans le navigateur, avec SES identifiants) :

      gh auth login --hostname github.com --scopes workflow

  Puis relance ce script.

EOF
  die "Compte absent."
fi

# Le compte d'origine est remis quoi qu'il arrive : succès, erreur, Ctrl-C.
# Sans ça, une interruption au milieu laisserait la machine sur le mauvais
# compte, et le prochain « gh » de l'utilisateur agirait sous la mauvaise
# identité sans prévenir.
restore_account() {
  if [ "${SWITCHED:-0}" = "1" ] && [ "$PREVIOUS_ACCOUNT" != "$GH_ACCOUNT" ]; then
    gh auth switch --hostname github.com --user "$PREVIOUS_ACCOUNT" >/dev/null 2>&1 || true
    printf '\n  \033[0;32m✓\033[0m Compte GitHub remis sur %s\n' "$PREVIOUS_ACCOUNT"
  fi
}
trap restore_account EXIT INT TERM

if [ "$GH_ACCOUNT" != "$PREVIOUS_ACCOUNT" ]; then
  gh auth switch --hostname github.com --user "$GH_ACCOUNT" >/dev/null
  SWITCHED=1
fi
GH_USER=$(gh api user --jq .login)
[ "$GH_USER" = "$GH_ACCOUNT" ] || die "La bascule a échoué (compte actif : $GH_USER)."
ok "Compte actif : $GH_USER"

# Le scope 'workflow' est requis pour pousser un fichier .github/workflows/.
gh auth status 2>&1 | awk -v u="$GH_USER" '
  $0 ~ "account " u { found=1 } found && /Token scopes/ { print; exit }' | grep -q workflow || {
  warn "Le jeton de $GH_USER n'a pas le droit « workflow » (requis pour le CI)."
  warn "Lance :  gh auth refresh -h github.com -s workflow"
  die "Puis relance ce script."
}
ok "Droit « workflow » présent"

# --------------------------------------------------------- 3. jeton Vercel
say "Jeton Vercel"
if [ -z "${VERCEL_TOKEN:-}" ]; then
  cat <<'EOF'
  Crée un jeton sur le compte Vercel visé :  https://vercel.com/account/tokens
    · Nom      : github-actions
    · Portée   : le compte concerné
    · Validité : au choix

  (On passe par un jeton plutôt que « vercel login » : la session Vercel déjà
   ouverte sur cette machine n'est ainsi jamais déconnectée.)

EOF
  printf '  Colle le jeton (saisie invisible) : '
  read -rs VERCEL_TOKEN
  echo
fi
[ -n "$VERCEL_TOKEN" ] || die "Jeton Vercel requis."

VERCEL_USER=$(vercel whoami --token "$VERCEL_TOKEN" 2>/dev/null | head -1 || true)
[ -n "$VERCEL_USER" ] || die "Jeton Vercel invalide ou expiré."
ok "Compte Vercel : $VERCEL_USER"

# ------------------------------------------------------- 4. confirmation
say "Récapitulatif"
cat <<EOF
  Dépôt GitHub  : $GH_USER/$REPO_NAME  ($VISIBILITY)
  Projet Vercel : $VERCEL_USER / $REPO_NAME
EOF
printf '\n  On y va ? [o/N] '
read -r confirm
[[ "$confirm" =~ ^[oOyY]$ ]] || die "Annulé, rien n'a été créé."

# --------------------------------------------------------------- 5. dépôt
say "Dépôt git local"
if [ ! -d .git ]; then
  git init -b main >/dev/null
  ok "dépôt initialisé (branche main)"
else
  ok "dépôt déjà initialisé"
fi
[ "$(git symbolic-ref --short HEAD)" = "main" ] || git branch -M main

git add -A
if git diff --cached --quiet; then
  ok "rien de nouveau à committer"
else
  git commit -q -m "Boîte à rythmes — réécriture Svelte 5 + TypeScript"
  ok "commit créé"
fi

# ------------------------------------------------------- 6. dépôt GitHub
say "Dépôt GitHub"
if gh repo view "$GH_USER/$REPO_NAME" >/dev/null 2>&1; then
  ok "dépôt existant : $GH_USER/$REPO_NAME"
  git remote get-url origin >/dev/null 2>&1 \
    || git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
else
  gh repo create "$GH_USER/$REPO_NAME" "--$VISIBILITY" --source=. --remote=origin
  ok "dépôt créé : $GH_USER/$REPO_NAME ($VISIBILITY)"
fi

# --------------------------------------------------------- 7. projet Vercel
say "Projet Vercel"
if [ -f .vercel/project.json ]; then
  ok "projet déjà lié"
else
  vercel link --yes --project "$REPO_NAME" --token "$VERCEL_TOKEN"
  ok "projet lié"
fi
ORG_ID=$(node -p "require('./.vercel/project.json').orgId")
PROJECT_ID=$(node -p "require('./.vercel/project.json').projectId")
[ -n "$ORG_ID" ] && [ -n "$PROJECT_ID" ] || die "Impossible de lire .vercel/project.json"
ok "identifiants du projet récupérés"

# ------------------------------------------------------------ 8. secrets
say "Secrets GitHub"
gh secret set VERCEL_TOKEN      --repo "$GH_USER/$REPO_NAME" --body "$VERCEL_TOKEN"
gh secret set VERCEL_ORG_ID     --repo "$GH_USER/$REPO_NAME" --body "$ORG_ID"
gh secret set VERCEL_PROJECT_ID --repo "$GH_USER/$REPO_NAME" --body "$PROJECT_ID"
ok "VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID enregistrés"

# -------------------------------------------------------------- 9. push
say "Envoi du code"
git push -u origin main
ok "poussé sur main"

say "Terminé"
cat <<EOF

  Dépôt   : https://github.com/$GH_USER/$REPO_NAME
  Actions : https://github.com/$GH_USER/$REPO_NAME/actions
  Vercel  : https://vercel.com/dashboard

  À chaque « git push » sur main : types vérifiés, tests lancés, builds —
  et déploiement en production seulement si tout est vert.

EOF
