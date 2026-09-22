#!/usr/bin/env bash
#
# lint。`npm run lint:safe` から呼ぶ。
#
# ⚠ `npx expo lint` を使わないこと。設定が無いと eslint を package.json に勝手に足し、
#   eslint.config.js も作る(2026-09-16 に一度コミットへ混入した)。
#   こちらは eslint を --no-save で入れ、設定はリポジトリの外(一時ファイル)に置く。
#
# 既知の指摘(このスクリプトを作った時点で残っているもの。新しく増やさないこと):
#   - src/components/paywall.tsx:74        react-hooks/set-state-in-effect
#   - src/hooks/use-color-scheme.web.ts:11 react-hooks/set-state-in-effect(テンプレート由来)

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d node_modules/eslint-config-expo ]; then
  npm i --no-save --no-audit --no-fund 'eslint@^9' 'eslint-config-expo@~57.0.2' >/dev/null
fi

CFG="$(mktemp "${TMPDIR:-/tmp}/katsu-eslint.XXXXXX")"
mv "$CFG" "$CFG.cjs"
CFG="$CFG.cjs"
trap 'rm -f "$CFG"' EXIT
printf "const expo = require('%s/node_modules/eslint-config-expo/flat');\nmodule.exports = [...expo, { ignores: ['dist/*'] }];\n" "$PWD" > "$CFG"

if [ "$#" -eq 0 ]; then
  set -- src
fi
npx eslint -c "$CFG" "$@"
