#!/bin/bash
# ストア用スクリーンショットの「元の画面」を撮る(英日 × 8画面)。見出しは tools/compose-screenshot.swift で付ける。
#
#   bash tools/sim/shoot-store.sh <出力フォルダ>
#
# ⚠ 先に tools/sim/build.sh で入れておくこと。Today に「通知がオフ」の案内が写らないよう、
#   一度アプリの中で通知を許可しておく(-katsuDevScreen onboarding:notifications で「通知を許可する」→「許可」)。
# ⚠ ロック画面の通知(01)は撮れない。シミュレーターを ⌘L でロックしてから
#   `xcrun simctl push <UDID> com.kisshi.gradhabit push.json` で通知を出して撮る(docs/HANDOFF.md)。
# 撮影用データは src/dev/demo-seed.ts。言葉は、入っていなければその言語のもので入る(撮る前に消す)。
set -u
OUT=${1:?出力フォルダ}; U=${SIM_UDID:-75873CD6-AA35-4F14-B897-ACBC06DC8140}; B=com.kisshi.gradhabit
mkdir -p "$OUT/en" "$OUT/ja"
xcrun simctl status_bar "$U" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3
M=$(find "$(xcrun simctl get_app_container "$U" $B data)/Library" -name manifest.json | head -1)
clear_words(){ xcrun simctl terminate "$U" $B 2>/dev/null; python3 - "$M" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p)); d.pop('katsu.messages',None); json.dump(d,open(p,'w'))
PY
}
shot(){ l=$1; n=$2; shift 2; if [ "$l" = ja ]; then LA='(ja)'; LO=ja_JP; else LA='(en)'; LO=en_US; fi
  xcrun simctl terminate "$U" $B 2>/dev/null; xcrun simctl launch "$U" $B "$@" -AppleLanguages "$LA" -AppleLocale $LO >/dev/null
  sleep 22; xcrun simctl io "$U" screenshot "$OUT/$l/$n.png" >/dev/null 2>&1 && echo "shot $l/$n"; }
for l in ja en; do
  clear_words
  pw=paywall; [ "$l" = ja ] && pw=paywall:jp   # シミュレーターは米国のストア。日本は ASC の円の値段を出す
  shot $l today      -katsuDevSeed progress
  shot $l words      -katsuDevSeed progress -katsuDevScreen katsu
  shot $l paywall    -katsuDevSeed progress -katsuDevScreen $pw
  shot $l graduation -katsuDevSeed graduation
  shot $l m-routine  -katsuDevSeed progress -katsuDevScreen onboarding:routine
  shot $l m-today    -katsuDevSeed progress -katsuDevTheme morning
  shot $l ny-day1    -katsuDevSeed milestone-1 -katsuDevTheme morning
  shot $l ny-grad    -katsuDevSeed graduation -katsuDevTheme morning
done
xcrun simctl status_bar "$U" clear
