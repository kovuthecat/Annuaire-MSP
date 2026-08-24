#!/bin/bash
# SessionStart — installe le plugin `workflow` dans les sessions Claude Code cloud.
#
# Pourquoi ce hook existe : `.claude/settings.json` déclare bien la marketplace
# `templates` (extraKnownMarketplaces) et active `workflow@templates`
# (enabledPlugins), mais une session distante ne clone jamais la marketplace au
# démarrage — `enabledPlugins` ne trouve donc rien à activer et les skills /
# agents / hooks du plugin sont absents. Ce script comble exactement ce trou.
#
# Synchrone à dessein : les composants (skills, agents) sont énumérés au
# démarrage du process, donc l'installation doit être terminée avant le premier
# tour de l'agent. Passer en async ferait perdre le bénéfice.
#
# En local, Claude Code résout le plugin nativement : on sort tout de suite.

set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

MARKETPLACE_REPO="kovuthecat/claude-workflow"
MARKETPLACE_NAME="templates"
PLUGIN="workflow@${MARKETPLACE_NAME}"

# Le CLI est le véhicule de tout ce qui suit : sans lui, autant le dire franchement plutôt que
# laisser trois commandes échouer l'une après l'autre.
if ! command -v claude >/dev/null 2>&1; then
  echo "[session-start] CLI claude introuvable — session sans plugin workflow." >&2
  exit 0
fi

# Idempotent : ne rien refaire si une reprise de session a déjà tout installé.
if claude plugin list 2>/dev/null | grep -q "workflow@${MARKETPLACE_NAME}"; then
  echo "[session-start] ${PLUGIN} déjà installé."
  exit 0
fi

# Best-effort à partir d'ici : une panne réseau sur GitHub ne doit pas empêcher
# la session de démarrer — on dégrade vers une session sans plugin, en le disant.
if ! claude plugin marketplace list 2>/dev/null | grep -q "${MARKETPLACE_NAME}"; then
  echo "[session-start] Ajout de la marketplace ${MARKETPLACE_NAME}…"
  if ! claude plugin marketplace add "${MARKETPLACE_REPO}"; then
    echo "[session-start] ÉCHEC de l'ajout de la marketplace — session sans plugin workflow." >&2
    exit 0
  fi
fi

# `--yes` n'est pas du confort : `claude plugin install --help` le dit « required when stdin or
# stdout is not a TTY ». Un hook SessionStart n'a jamais de TTY — sans ce flag, l'installation
# peut se bloquer sur une confirmation que personne ne verra, et la session démarre sans plugin.
echo "[session-start] Installation de ${PLUGIN}…"
if ! claude plugin install "${PLUGIN}" --yes; then
  echo "[session-start] ÉCHEC de l'installation de ${PLUGIN} — session sans plugin workflow." >&2
  exit 0
fi

echo "[session-start] Terminé."
