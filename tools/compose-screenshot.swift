// App Store 用のスクリーンショットを組む(1290x2796, APP_IPHONE_67)。
// 使い方: swift compose.swift <入力> <出力> "<1行目>" "<2行目>" [maskX maskY maskW maskH]
//   mask は入力画像の座標。周囲の色で塗りつぶす(開発メニューのボタンを隠すため)。
import AppKit

let args = CommandLine.arguments
guard args.count >= 5 else {
  print("usage: compose.swift in out line1 line2 [x y w h]"); exit(1)
}
let (inPath, outPath, line1, line2) = (args[1], args[2], args[3], args[4])
guard let src = NSImage(contentsOfFile: inPath),
      let srcRep = src.representations.first as? NSBitmapImageRep ?? NSBitmapImageRep(data: src.tiffRepresentation!) else {
  print("cannot read \(inPath)"); exit(1)
}
let sw = CGFloat(srcRep.pixelsWide), sh = CGFloat(srcRep.pixelsHigh)
guard var srcCG = srcRep.cgImage else { exit(1) }

// 開発メニューのボタンを周囲の色で塗る
if args.count >= 9, let mx = Double(args[5]), let my = Double(args[6]), let mw = Double(args[7]), let mh = Double(args[8]) {
  let ctx = CGContext(data: nil, width: Int(sw), height: Int(sh), bitsPerComponent: 8, bytesPerRow: 0,
                      space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(srcCG, in: CGRect(x: 0, y: 0, width: sw, height: sh))
  // ⚠ 色は描いた後のピクセルから取る。NSBitmapImageRep から取ると色空間がずれて四角が浮く
  let px = ctx.data!.assumingMemoryBound(to: UInt8.self)
  let sx = Int(mx + mw) + 20, sy = Int(my + mh / 2)  // メモリ上は上の行から並ぶ
  let o = sy * ctx.bytesPerRow + sx * 4
  let sample = CGColor(srgbRed: CGFloat(px[o]) / 255, green: CGFloat(px[o + 1]) / 255, blue: CGFloat(px[o + 2]) / 255, alpha: 1)
  ctx.setFillColor(sample)
  // CG は左下原点
  ctx.fill(CGRect(x: mx, y: Double(sh) - my - mh, width: mw, height: mh))
  srcCG = ctx.makeImage()!
}

let W: CGFloat = 1290, H: CGFloat = 2796
let bg = NSColor(srgbRed: 0x0A / 255.0, green: 0x0C / 255.0, blue: 0x14 / 255.0, alpha: 1)
let ink = NSColor(srgbRed: 0xF4 / 255.0, green: 0xF1 / 255.0, blue: 0xE8 / 255.0, alpha: 1)

let out = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(W), pixelsHigh: Int(H), bitsPerSample: 8,
                           samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                           bytesPerRow: 0, bitsPerPixel: 0)!
out.size = NSSize(width: W, height: H)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: out)
bg.setFill()
NSRect(x: 0, y: 0, width: W, height: H).fill()

// 見出し(2行・中央揃え)
let font = NSFont(name: "HelveticaNeue", size: 118) ?? NSFont.systemFont(ofSize: 118)
let para = NSMutableParagraphStyle()
para.alignment = .center
para.lineSpacing = 0
let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: ink, .paragraphStyle: para]
let caption = NSAttributedString(string: "\(line1)\n\(line2)", attributes: attrs)
let captionTop: CGFloat = 120
let captionHeight: CGFloat = 300
caption.draw(in: NSRect(x: 40, y: H - captionTop - captionHeight, width: W - 80, height: captionHeight))

// 画面(角丸で下寄せ)
let top: CGFloat = captionTop + captionHeight + 40
let bottomMargin: CGFloat = 60
let targetH = H - top - bottomMargin
let targetW = targetH * sw / sh
let rect = NSRect(x: (W - targetW) / 2, y: bottomMargin, width: targetW, height: targetH)
let clip = NSBezierPath(roundedRect: rect, xRadius: 56, yRadius: 56)
clip.addClip()
NSGraphicsContext.current!.cgContext.interpolationQuality = .high
NSGraphicsContext.current!.cgContext.draw(srcCG, in: rect)
NSGraphicsContext.restoreGraphicsState()

let png = out.representation(using: .png, properties: [:])!
try! png.write(to: URL(fileURLWithPath: outPath))
print("wrote \(outPath) \(Int(W))x\(Int(H))")
