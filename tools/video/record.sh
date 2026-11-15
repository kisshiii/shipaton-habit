#!/bin/bash
# シミュレーターの画面を、状態と言語を決めて撮る(TikTok の素材)。
#
#   bash tools/video/record.sh <出力.mov> [-t 秒] [--seed 状態] [--screen 画面] [--theme 組] [--lang ja|en]
#
#   bash tools/video/record.sh ~/katsu-video/raw/today-ja.mov --seed progress --lang ja
#   bash tools/video/record.sh ~/katsu-video/raw/onb-words-en.mov --screen onboarding:words --lang en -t 20
#
# - 先に `bash tools/sim/build.sh` で撮影用の版を入れておく(App Store 版とは別物)
# - -t が無ければ、Enter を押すまで撮る。画面の操作(タップ・入力)は Mac のマウスとキーボードで本人が行う
# - 状態・画面・組の名前は docs/HANDOFF.md「撮影用の状態と画面」
# - 状態バーは 9:41・電波と電池は満タンにそろえる。⚠ ホーム画面とロック画面には効かない(SpringBoard)
# - ⚠ 振動は映らないし、シミュレーターでは鳴らない。ロック画面の通知は実機で撮る(docs/marketing/tiktok.md §2)
set -eu
U=${SIM_UDID:-75873CD6-AA35-4F14-B897-ACBC06DC8140}; B=com.kisshi.gradhabit
OUT=${1:?出力ファイル(.mov)を指定}; shift
SECS=""; ARGS=(); LANG_=""
while [ $# -gt 0 ]; do
  case $1 in
    -t) SECS=$2; shift 2 ;;
    --seed) ARGS+=(-katsuDevSeed "$2"); shift 2 ;;
    --screen) ARGS+=(-katsuDevScreen "$2"); shift 2 ;;
    --theme) ARGS+=(-katsuDevTheme "$2"); shift 2 ;;
    --lang) LANG_=$2; shift 2 ;;
    *) echo "知らない引数: $1"; exit 1 ;;
  esac
done
case $LANG_ in
  ja) ARGS+=(-AppleLanguages "(ja)" -AppleLocale ja_JP) ;;
  en) ARGS+=(-AppleLanguages "(en)" -AppleLocale en_US) ;;
  "") ;;
  *) echo "--lang は ja か en"; exit 1 ;;
esac
mkdir -p "$(dirname "$OUT")"

xcrun simctl boot "$U" 2>/dev/null || true; open -a Simulator; xcrun simctl bootstatus "$U" >/dev/null 2>&1
xcrun simctl ui "$U" appearance dark
xcrun simctl status_bar "$U" override --time 9:41 --batteryState charged --batteryLevel 100 \
  --cellularBars 4 --wifiBars 3 --dataNetwork wifi
xcrun simctl terminate "$U" $B 2>/dev/null || true
xcrun simctl launch "$U" $B ${ARGS[@]+"${ARGS[@]}"} >/dev/null
sleep 3   # 起動画面を撮らない

xcrun simctl io "$U" recordVideo --codec h264 --force "$OUT" &
REC=$!
sleep 1
if [ -n "$SECS" ]; then
  sleep "$SECS"
else
  read -r -p "撮影中。終わったら Enter ... " _
fi
kill -INT $REC; wait $REC 2>/dev/null || true
echo "→ $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
