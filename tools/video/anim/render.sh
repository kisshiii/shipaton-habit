#!/bin/bash
# HTML の canvas アニメーションを、1コマずつ描いて mp4 にする(TikTok 用 1080x1920・30fps)。
#
#   bash tools/video/anim/render.sh <アニメの.html> <秒数> <出力.mp4> [同時に動かす数]
#   bash tools/video/anim/render.sh tools/video/anim/happy.html 18 ~/katsu-video/out3/happy.mp4
#
# - HTML は ?t=秒 を読んでその瞬間の1コマを描く作りにする(乱数は種つきにして、毎回同じ絵にする)
# - 同じフォルダに icon.png(アプリのアイコン)を置く。無ければ app/assets/images/icon.png をコピーする
# - Chrome を1コマずつ起こすので、18秒(540コマ)で10分ほどかかる
# - 音は無音のトラックを入れる。曲は TikTok で付ける(ロイヤリティフリーの曲)
# - ⚠ 文字と大事な絵は、TikTok で隠れる範囲(上200 / 下450 / 右150 の高さ700〜1600)の外に置く
set -eu
HTML=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); SECS=$2; OUT=$3; JOBS=${4:-8}
DIR=$(dirname "$HTML"); FRAMES=$(mktemp -d); N=$(python3 -c "print(int(round($SECS*30)))")
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
[ -f "$DIR/icon.png" ] || cp "$ROOT/app/assets/images/icon.png" "$DIR/icon.png"
export HTML FRAMES C
seq 0 $((N - 1)) | xargs -P "$JOBS" -I{} bash -c '
  i={}; t=$(python3 -c "print(f\"{$i/30:.4f}\")"); P=$(mktemp -d)
  "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$P" --allow-file-access-from-files \
    --force-device-scale-factor=1 --window-size=1080,1920 --virtual-time-budget=1500 \
    --screenshot="$FRAMES/f$(printf %04d $i).png" "file://$HTML?t=$t" 2>/dev/null; rm -rf "$P"'
mkdir -p "$(dirname "$OUT")"
ffmpeg -y -v error -framerate 30 -i "$FRAMES/f%04d.png" -f lavfi -i anullsrc=r=44100:cl=stereo \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -shortest -movflags +faststart "$OUT"
rm -rf "$FRAMES"
echo "→ $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
