// 一覧の画像を作る(見本の確認用): swift tools/contact-sheet.swift <出力.jpg> <画像>...
// 5列に並べる。並びは引数の順。
import AppKit
let a = CommandLine.arguments; let out = a[1]; let files = Array(a[2...])
let w: CGFloat = 300, h: CGFloat = 650, cols = 5
let rows = (files.count + cols - 1) / cols
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(w) * cols, pixelsHigh: Int(h) * rows, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSColor.white.setFill(); NSRect(x: 0, y: 0, width: w * CGFloat(cols), height: h * CGFloat(rows)).fill()
for (i, f) in files.enumerated() { guard let im = NSImage(contentsOfFile: f) else { continue }
  let c = i % cols, r = i / cols
  im.draw(in: NSRect(x: CGFloat(c) * w + 2, y: h * CGFloat(rows - 1 - r) + 2, width: w - 4, height: h - 4)) }
try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.8])!.write(to: URL(fileURLWithPath: out))
