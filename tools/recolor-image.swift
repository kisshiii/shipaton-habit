import AppKit
// 字の形はそのままで、地と字の色を置き換える(2026-11-10 にアイコンと起動画面を炭にしたもの)。
// swift tools/recolor-image.swift <元の画像> <出力> <地hex> <字hex>   例: 2B2A28 F0EDE5
// ⚠ 元の画像は紺地・生成りの字(git の 13378fa より前の app/assets/images/icon.png)。色空間の変換を挟まず、生のバイトで書く
func rgb(_ h: String) -> [Double] { let v = Int(h, radix: 16)!; return [Double(v >> 16), Double(v >> 8 & 255), Double(v & 255)] }
let a = CommandLine.arguments
let src = NSBitmapImageRep(data: try! Data(contentsOf: URL(fileURLWithPath: a[1])))!
let w = src.pixelsWide, h = src.pixelsHigh
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
ctx.draw(src.cgImage!, in: CGRect(x: 0, y: 0, width: w, height: h))
let p = ctx.data!.assumingMemoryBound(to: UInt8.self)
let b = rgb(a[3]), f = rgb(a[4])
for i in 0..<(w * h) {
  var t = (Double(p[i * 4]) - 15) / (250 - 15); t = min(1, max(0, t)); if t < 0.04 { t = 0 }; if t > 0.96 { t = 1 }
  for k in 0..<3 { p[i * 4 + k] = UInt8((b[k] + (f[k] - b[k]) * t).rounded()) }
}
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil); CGImageDestinationFinalize(dest)
