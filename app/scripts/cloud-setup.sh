#!/usr/bin/env bash
#
# クラウド環境(Claude Code on the web など)でクローンした直後に1回実行する。
#   bash app/scripts/cloud-setup.sh
#
# やること:
#   1. 依存を入れる(npm ci)
#   2. gitignore 済みで、無いと型チェックとバンドルが通らないファイルを用意する
#      - expo-env.d.ts
#      - src/config/blocklist.ts(Tier 1 の判定リスト。⚠ 中身をコミットしない)
#   3. App Store Connect API の鍵を、環境変数があればリポジトリの外に書き出す
#
# 秘密情報はここに書かない。値はすべて環境変数から受け取る(名前は CLAUDE.md を参照)。

set -euo pipefail
cd "$(dirname "$0")/.."

echo "[cloud-setup] node $(node -v)  (推奨: 22.13 以上。22.2 だと EBADENGINE の警告が出るが動く)"

npm ci --no-audit --no-fund

if [ ! -f expo-env.d.ts ]; then
  printf '/// <reference types="expo/types" />\n' > expo-env.d.ts
  echo "[cloud-setup] wrote expo-env.d.ts"
fi

if [ ! -f src/config/blocklist.ts ]; then
  if [ -n "${KATSU_BLOCKLIST_TS_BASE64:-}" ]; then
    printf '%s' "$KATSU_BLOCKLIST_TS_BASE64" | base64 -d > src/config/blocklist.ts
    echo "[cloud-setup] wrote src/config/blocklist.ts from KATSU_BLOCKLIST_TS_BASE64"
  else
    # 空のリスト。型チェックとバンドルを通すためだけのもの。
    # ⚠ これで作ったビルドは Tier 1 が何も弾かない。配布用のビルドは EAS で行うこと
    #   (EAS は file 型 secret の TIER1_BLOCKLIST_TS から本物を配置する)
    cat > src/config/blocklist.ts <<'EOF'
// ⚠ cloud-setup.sh が作った空のリスト。コミットしないこと(.gitignore 済み)。
// 本物は EAS の file 型 secret `TIER1_BLOCKLIST_TS`。src/config/README.md を参照。
export const DIRECT_PHRASES: readonly string[] = [];
export const HARM_TERMS: readonly string[] = [];
export const SELF_TARGETS: readonly string[] = ['myself', 'me'];
EOF
    echo "[cloud-setup] wrote an EMPTY placeholder src/config/blocklist.ts (Tier 1 blocks nothing in local runs)"
  fi
fi

if [ -n "${ASC_KEY_P8_BASE64:-}" ]; then
  mkdir -p "$HOME/.asc"
  printf '%s' "$ASC_KEY_P8_BASE64" | base64 -d > "$HOME/.asc/AuthKey.p8"
  chmod 600 "$HOME/.asc/AuthKey.p8"
  echo "[cloud-setup] wrote the App Store Connect key to ~/.asc/AuthKey.p8"
  echo "[cloud-setup] export ASC_KEY_PATH=\$HOME/.asc/AuthKey.p8 before running scripts/asc-builds.js"
fi

echo "[cloud-setup] done. Next: npx tsc --noEmit && npm run test:graduation"
