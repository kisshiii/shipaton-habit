#!/bin/bash
# この Mac でシミュレーター向けにビルドし、署名し直して入れる(EAS の回数を使わない)。
#
#   bash tools/sim/build.sh            # ビルド → 署名 → シミュレーターに入れ直す(データは消える)
#   bash tools/sim/build.sh --pods     # 先に pod install もする(ネイティブの部品を足したとき)
#
# 前提(docs/HANDOFF.md「この Mac でシミュレーター向けにビルドする」):
#   - CocoaPods は ~/.katsu-gems に入れてある(Homebrew の Ruby を使う)
#   - app/ios は `EXPO_NO_CAPABILITY_SYNC=1 npx expo prebuild --platform ios --clean --no-install` で作ってある
# 撮影用の仕組み(-katsuDevSeed など)が入るよう EXPO_PUBLIC_KATSU_DEV_TOOLS=1 でビルドする。App Store 版とは別物。
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd); APP=$ROOT/app
U=${SIM_UDID:-75873CD6-AA35-4F14-B897-ACBC06DC8140}; B=com.kisshi.gradhabit
OUT=${KATSU_SIM_OUT:-$HOME/.katsu-sim}; mkdir -p "$OUT"
F=$APP/node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Coding/JavaScriptCodable+Date.swift

if [ "${1:-}" = "--pods" ]; then
  R=/usr/local/Homebrew/Library/Homebrew/vendor/portable-ruby/4.0.9/bin
  (cd "$APP/ios" && export GEM_HOME=$HOME/.katsu-gems GEM_PATH=$HOME/.katsu-gems PATH=$R:$HOME/.katsu-gems/bin:$PATH LANG=en_US.UTF-8 && pod install > "$OUT/pod.log" 2>&1) || { echo "pod install failed: $OUT/pod.log"; exit 1; }
fi

# ⚠ Xcode 26.3 だと expo-modules-jsi の abs(...) が「曖昧」で止まる。ビルドの間だけ Swift.abs に書き換え、必ず戻す
cp "$F" "$OUT/JavaScriptCodable+Date.swift.orig"
trap 'cp "$OUT/JavaScriptCodable+Date.swift.orig" "$F"' EXIT
sed -i '' 's/guard milliseconds.isFinite, abs(milliseconds)/guard milliseconds.isFinite, Swift.abs(milliseconds)/' "$F"

echo "building (初回30分ほど) ... log: $OUT/xcodebuild.log"
(cd "$APP/ios" && EXPO_PUBLIC_KATSU_DEV_TOOLS=1 LANG=en_US.UTF-8 xcodebuild -workspace KATSU.xcworkspace -scheme KATSU \
  -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$OUT/dd" CODE_SIGNING_ALLOWED=NO build > "$OUT/xcodebuild.log" 2>&1) \
  || { grep -n "error:" "$OUT/xcodebuild.log" | head -5; exit 1; }

# App Group を使えるよう、entitlements 付きで署名し直す(本体は aps-environment を除く)
rm -rf "$OUT/signed"; mkdir -p "$OUT/signed"; cp -R "$OUT/dd/Build/Products/Release-iphonesimulator/KATSU.app" "$OUT/signed/"
A=$OUT/signed/KATSU.app
grep -v "aps-environment\|<string>development" "$APP/ios/KATSU/KATSU.entitlements" > "$OUT/app.entitlements"
for fw in "$A"/Frameworks/*; do codesign -f -s - "$fw" 2>/dev/null; done
codesign -f -s - --entitlements "$APP/ios/ExpoWidgetsTarget/ExpoWidgetsTarget.entitlements" "$A/PlugIns/ExpoWidgetsTarget.appex"
codesign -f -s - --entitlements "$OUT/app.entitlements" "$A"

xcrun simctl boot "$U" 2>/dev/null; open -a Simulator; xcrun simctl bootstatus "$U" >/dev/null 2>&1
xcrun simctl terminate "$U" $B 2>/dev/null; xcrun simctl uninstall "$U" $B; xcrun simctl install "$U" "$A" && echo "installed: $A"
