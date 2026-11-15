import AppKit
// 検索結果のクリエイティブアセット(3:2、3840×2560)。炭の地に、見出しと通知のカード。
// search <out> <lang> <見出し1> <見出し2> <通知の題> <通知の本文> <今> <icon.png> <glyph.png>
let a = CommandLine.arguments
let out = a[1], lang = a[2], cap1 = a[3], cap2 = a[4], title = a[5], body = a[6], now = a[7]
let icon = NSImage(contentsOfFile: a[8])!, glyph = NSImage(contentsOfFile: a[9])!
let W: CGFloat = 3840, H: CGFloat = 2560
// Apple の安全な範囲(上からの座標): x 836, y 765, 2168 × 1030
let sx: CGFloat = 836, sy: CGFloat = 765, sw: CGFloat = 2168, sh: CGFloat = 1030
func top(_ y: CGFloat, _ h: CGFloat) -> CGFloat { H - y - h } // 上からの座標 → AppKit
let charcoal = NSColor(srgbRed: 0x2B / 255, green: 0x2A / 255, blue: 0x28 / 255, alpha: 1)
let ink = NSColor(srgbRed: 0xF0 / 255, green: 0xED / 255, blue: 0xE5 / 255, alpha: 1)
func font(_ size: CGFloat, bold: Bool) -> NSFont {
  if lang == "ja" { return NSFont(name: bold ? "HiraginoSans-W7" : "HiraginoSans-W4", size: size)! }
  return NSFont.systemFont(ofSize: size, weight: bold ? .bold : .regular)
}
func width(_ s: String, _ f: NSFont) -> CGFloat { NSAttributedString(string: s, attributes: [.font: f]).size().width }
func fit(_ lines: [String], _ size: CGFloat, bold: Bool, max: CGFloat) -> NSFont {
  var s = size; while s > 40, lines.map({ width($0, font(s, bold: bold)) }).max()! > max { s -= 2 }; return font(s, bold: bold)
}

let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(W), pixelsHigh: Int(H), bitsPerSample: 8, samplesPerPixel: 3, hasAlpha: false, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 32)!
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
charcoal.setFill(); NSRect(x: 0, y: 0, width: W, height: H).fill()

// 背景: 大きな「喝」をごく薄く、右下に(安全な範囲の外は、切れてもよい飾り)
glyph.draw(in: NSRect(x: 2300, y: -700, width: 2400, height: 2400), from: .zero, operation: .sourceOver, fraction: 0.07)

// 見出し(2行・中央)
let p = NSMutableParagraphStyle(); p.alignment = .center
let capFont = fit([cap1, cap2], 190, bold: true, max: sw)
let capH: CGFloat = capFont.pointSize * 1.35 * 2
NSAttributedString(string: "\(cap1)\n\(cap2)", attributes: [.font: capFont, .foregroundColor: ink, .paragraphStyle: p])
  .draw(in: NSRect(x: sx, y: top(sy, capH), width: sw, height: capH))

// 通知のカード(ロック画面の通知と同じ並び)
let cardY: CGFloat = sy + capH + 90, cardH: CGFloat = sh - capH - 90
let card = NSRect(x: sx, y: top(cardY, cardH), width: sw, height: cardH)
NSColor(white: 1, alpha: 0.10).setFill(); NSBezierPath(roundedRect: card, xRadius: 96, yRadius: 96).fill()
NSColor(white: 1, alpha: 0.16).setStroke(); let border = NSBezierPath(roundedRect: card.insetBy(dx: 2, dy: 2), xRadius: 94, yRadius: 94); border.lineWidth = 4; border.stroke()
let pad: CGFloat = 70, iconSize = min(cardH - pad * 2, 230)
let iconRect = NSRect(x: card.minX + pad, y: card.midY - iconSize / 2, width: iconSize, height: iconSize)
NSGraphicsContext.saveGraphicsState(); NSBezierPath(roundedRect: iconRect, xRadius: iconSize * 0.225, yRadius: iconSize * 0.225).addClip(); icon.draw(in: iconRect); NSGraphicsContext.restoreGraphicsState()
let textX = iconRect.maxX + 60, textW = card.maxX - pad - textX
let nowFont = font(66, bold: false); let nowW = width(now, nowFont)
let titleFont = fit([title], 92, bold: true, max: textW - nowW - 40)
let bodyFont = fit([body], 88, bold: false, max: textW)
let lineGap: CGFloat = 18
let block = titleFont.pointSize * 1.25 + lineGap + bodyFont.pointSize * 1.25
let blockTop = card.midY + block / 2
NSAttributedString(string: title, attributes: [.font: titleFont, .foregroundColor: ink])
  .draw(at: NSPoint(x: textX, y: blockTop - titleFont.pointSize * 1.25))
NSAttributedString(string: now, attributes: [.font: nowFont, .foregroundColor: ink.withAlphaComponent(0.6)])
  .draw(at: NSPoint(x: card.maxX - pad - nowW, y: blockTop - titleFont.pointSize * 1.15))
NSAttributedString(string: body, attributes: [.font: bodyFont, .foregroundColor: ink.withAlphaComponent(0.92)])
  .draw(at: NSPoint(x: textX, y: blockTop - block))

try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
print("wrote \(out)")
