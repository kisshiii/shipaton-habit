// App Store の App 内イベント用の画像を組む(年始のイベント「66 Days, Starting January 1」)。
// 使い方: swift tools/compose-event.swift <出力先ディレクトリ>
//   event-card-{en,ja}.png   1920x1080(16:9。カード)
//   event-detail-{en,ja}.png 1080x1920(9:16。詳細ページ)
// 見た目は節目の画面と同じ: 紺の地、クリームの明朝(英語は New York)、細い罫線。
// ⚠ カードには App Store がイベント名と短い説明を重ねる(下側)。大事なものは中央に寄せ、下は空けておく。
// ⚠ 感嘆符・絵文字・紙吹雪は使わない(罪悪感も高揚もあおらない。CLAUDE.md)。
import AppKit

let args = CommandLine.arguments
guard args.count >= 2 else { print("usage: compose-event.swift <out-dir>"); exit(1) }
let outDir = (args[1] as NSString).expandingTildeInPath
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

// スクリプトの位置からリポジトリの根を割り出す(どこから実行しても素材が読めるように)
let repoRoot = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().path
let splashPath = "\(repoRoot)/app/assets/images/splash-icon.png"

// アプリと同じ色
func srgb(_ hex: Int, _ a: CGFloat = 1) -> NSColor {
  NSColor(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
          blue: CGFloat(hex & 0xFF) / 255, alpha: a)
}
let navy = srgb(0x0F1B61)
let cream = srgb(0xFAF0E0)
let creamSoft = srgb(0xFAF0E0, 0.72)
let rule = srgb(0xFAF0E0, 0.22)

// 書体。英語は New York(システムの serif)、日本語はヒラギノ明朝
func serif(_ size: CGFloat, _ weight: NSFont.Weight = .regular) -> NSFont {
  let base = NSFont.systemFont(ofSize: size, weight: weight)
  if let d = base.fontDescriptor.withDesign(.serif), let f = NSFont(descriptor: d, size: size) { return f }
  return NSFont(name: "Times New Roman", size: size)!
}
func mincho(_ size: CGFloat, bold: Bool = false) -> NSFont {
  NSFont(name: bold ? "HiraMinProN-W6" : "HiraMinProN-W3", size: size) ?? serif(size)
}

// スプラッシュの印をクリームの形だけ抜き出す(四角い地が紺の上で浮かないように)
func splashMask() -> CGImage? {
  guard let img = NSImage(contentsOfFile: splashPath),
        let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
  let w = cg.width, h = cg.height
  let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                      space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue)!
  ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
  // 明るさで2値に近づける。紺(暗い)は 0、クリーム(明るい)は 1
  let px = ctx.data!.assumingMemoryBound(to: UInt8.self)
  for y in 0..<h {
    for x in 0..<w {
      let o = y * ctx.bytesPerRow + x
      let v = (Double(px[o]) / 255 - 0.25) / 0.6
      px[o] = UInt8(max(0, min(1, v)) * 255)
    }
  }
  return ctx.makeImage()
}
let mark = splashMask()

/// 1行の文字列を、中心 x・ベースライン y に置く
func drawCentered(_ s: NSAttributedString, cx: CGFloat, baseline: CGFloat) {
  let line = CTLineCreateWithAttributedString(s)
  let w = CTLineGetTypographicBounds(line, nil, nil, nil)
  let ctx = NSGraphicsContext.current!.cgContext
  ctx.textPosition = CGPoint(x: cx - CGFloat(w) / 2, y: baseline)
  CTLineDraw(line, ctx)
}

func attr(_ s: String, _ font: NSFont, _ color: NSColor, kern: CGFloat = 0) -> NSAttributedString {
  NSAttributedString(string: s, attributes: [.font: font, .foregroundColor: color, .kern: kern])
}

struct Lang {
  let code: String
  let big: NSAttributedString      // 「Day 1 / 66」
  let date: NSAttributedString     // 「January 1」
  let caption: NSAttributedString? // 大きい字の上に置く小さな前置き(日本語だけ)
}

func lang(_ code: String, scale s: CGFloat) -> Lang {
  if code == "ja" {
    // アプリの表記に合わせる(ja: 「66日のうち1日」)。大きく見せるのは「1日目」
    let big = NSMutableAttributedString()
    big.append(attr("1", mincho(230 * s), cream))
    big.append(attr("日目", mincho(140 * s), cream))
    return Lang(code: code, big: big,
                date: attr("1月1日", mincho(64 * s), creamSoft, kern: 10 * s),
                caption: attr("66日のうち", mincho(52 * s), creamSoft, kern: 8 * s))
  }
  let big = NSMutableAttributedString()
  big.append(attr("Day 1", serif(220 * s), cream))
  big.append(attr("  / 66", serif(120 * s), creamSoft))
  return Lang(code: code, big: big,
              date: attr("JANUARY 1", serif(48 * s, .medium), creamSoft, kern: 12 * s),
              caption: nil)
}

func render(code: String, W: CGFloat, H: CGFloat, name: String) {
  let out = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(W), pixelsHigh: Int(H), bitsPerSample: 8,
                             samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                             bytesPerRow: 0, bitsPerPixel: 0)!
  out.size = NSSize(width: W, height: H)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: out)
  let ctx = NSGraphicsContext.current!.cgContext
  ctx.interpolationQuality = .high

  navy.setFill()
  NSRect(x: 0, y: 0, width: W, height: H).fill()

  let portrait = H > W
  let L = lang(code, scale: 1)
  let cx = W / 2

  // 縦の配置。CG は左下原点。
  // カード: 中央より少し上に寄せる(下 1/3 に App Store の文字が乗る)
  // 詳細: 上半分の中央あたり(下側に App Store の文字とボタンが乗る)
  let center: CGFloat = portrait ? H * 0.60 : H * 0.56
  let markSize: CGFloat = portrait ? 120 : 96

  // 大きい字のベースライン
  let bigBaseline = center - 40
  let ruleY = bigBaseline - 90
  let dateBaseline = ruleY - 100

  // 印(小さく、上に)
  if let m = mark {
    let top = L.caption != nil ? bigBaseline + 220 + 100 : bigBaseline + 220 + 70
    let r = CGRect(x: cx - markSize / 2, y: top, width: markSize, height: markSize)
    ctx.saveGState()
    ctx.clip(to: r, mask: m)
    cream.setFill()
    r.fill()
    ctx.restoreGState()
  }

  if let c = L.caption {
    drawCentered(c, cx: cx, baseline: bigBaseline + 220)
  }
  drawCentered(L.big, cx: cx, baseline: bigBaseline)

  // 細い罫線
  rule.setFill()
  NSRect(x: cx - 120, y: ruleY, width: 240, height: 2).fill()

  drawCentered(L.date, cx: cx, baseline: dateBaseline)

  NSGraphicsContext.restoreGraphicsState()
  let path = "\(outDir)/\(name)"
  // App Store はアルファ付きを嫌うので、アルファの無い絵に描き直して書き出す
  let flat = CGContext(data: nil, width: Int(W), height: Int(H), bitsPerComponent: 8, bytesPerRow: 0,
                       space: CGColorSpace(name: CGColorSpace.sRGB)!,
                       bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  flat.draw(out.cgImage!, in: CGRect(x: 0, y: 0, width: W, height: H))
  let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, "public.png" as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, flat.makeImage()!, nil)
  CGImageDestinationFinalize(dest)
  print("wrote \(path) \(Int(W))x\(Int(H))")
}

for code in ["en", "ja"] {
  render(code: code, W: 1920, H: 1080, name: "event-card-\(code).png")
  render(code: code, W: 1080, H: 1920, name: "event-detail-\(code).png")
}
