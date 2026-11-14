import CoreHaptics
import ExpoModulesCore

/**
 * チェックしたときの振動(1.0.3、plan §10)。
 *
 * expo-haptics は決まった型(軽く1回・強く1回など)しか鳴らせない。
 * ここは Core Haptics で、強さ・鋭さ・長さを組み立てた振動を鳴らす。
 *   - `check`:   1件チェックした。手応えのある「トン」
 *   - `allDone`: 今日の分を全部やり切った。細かい連打がだんだん強くなり、最後に大きく「ドン」(約1秒)
 *
 * ⚠ **毎回必ず同じものを鳴らす。**「たまにしか鳴らない」「ランダムで大きい」にしないこと。
 *   当たるかどうか分からない報酬は賭け事の仕組みで、このアプリが避けているもの(plan §10)。
 * ⚠ 鳴らせない端末(iPad など)では false を返す。JS 側が expo-haptics に落とす。
 * ⚠ 強さやリズムを変えるときは、下の数字だけを直す。実機でしか確かめられない(シミュレーターは鳴らない)。
 */
final class KatsuHapticsPlayer: @unchecked Sendable { // 状態は queue で守る
  static let shared = KatsuHapticsPlayer()

  private let queue = DispatchQueue(label: "com.kisshi.gradhabit.haptics")
  private var engine: CHHapticEngine?

  func play(_ name: String) -> Bool {
    guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return false }
    guard let events = Self.events(named: name) else { return false }
    queue.async { [weak self] in self?.run(events) }
    return true
  }

  private func run(_ events: [CHHapticEvent]) {
    do {
      let current = try engine ?? makeEngine()
      engine = current
      // 止まっていても始め直せる。動いていれば何も起きない
      try current.start()
      let pattern = try CHHapticPattern(events: events, parameters: [])
      try current.makePlayer(with: pattern).start(atTime: CHHapticTimeImmediate)
    } catch {
      // 鳴らせなくても画面は止めない。次に押したとき作り直す
      engine = nil
    }
  }

  private func makeEngine() throws -> CHHapticEngine {
    let created = try CHHapticEngine()
    // 音は出さない(消音の設定や、ほかのアプリの音楽に触らない)
    created.playsHapticsOnly = true
    // 鳴らし終わったら勝手に止まる。電池を使い続けない
    created.isAutoShutdownEnabled = true
    // 電話などで作り直しが要るとき。次に押したとき作り直す
    created.resetHandler = { [weak self] in
      self?.queue.async { self?.engine = nil }
    }
    return created
  }

  // MARK: - 振動の中身

  private static func tap(_ time: TimeInterval, _ intensity: Float, _ sharpness: Float) -> CHHapticEvent {
    CHHapticEvent(
      eventType: .hapticTransient,
      parameters: [
        CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
        CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness),
      ],
      relativeTime: time
    )
  }

  private static func rumble(
    _ time: TimeInterval, _ duration: TimeInterval, _ intensity: Float, _ sharpness: Float
  ) -> CHHapticEvent {
    CHHapticEvent(
      eventType: .hapticContinuous,
      parameters: [
        CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
        CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness),
      ],
      relativeTime: time,
      duration: duration
    )
  }

  private static func events(named name: String) -> [CHHapticEvent]? {
    switch name {
    case "check":
      // 「トン」。鋭すぎると軽く、鈍すぎるとぼやける
      return [tap(0, 1.0, 0.45)]

    case "allDone":
      var events: [CHHapticEvent] = []
      // 連打: 間隔を詰めながら、だんだん強く・鋭く
      let times: [TimeInterval] = [0.00, 0.10, 0.19, 0.27, 0.34, 0.40, 0.45, 0.49, 0.53]
      for (index, time) in times.enumerated() {
        let step = Float(index)
        events.append(tap(time, 0.35 + 0.07 * step, 0.40 + 0.05 * step))
      }
      // 下で鳴り続ける低いうなり: 4段でだんだん強く
      for step in 0..<4 {
        events.append(rumble(0.14 * Double(step), 0.14, 0.15 + 0.15 * Float(step), 0.25))
      }
      // 一拍おいて「ドン」。あとは3段で消えていく
      let hit: TimeInterval = 0.66
      events.append(tap(hit, 1.0, 0.30))
      events.append(rumble(hit, 0.12, 1.0, 0.15))
      events.append(rumble(hit + 0.12, 0.12, 0.6, 0.15))
      events.append(rumble(hit + 0.24, 0.12, 0.3, 0.15))
      return events

    default:
      return nil
    }
  }
}

public class KatsuHapticsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KatsuHaptics")

    /// 鳴らせたら true。鳴らせない端末・知らない名前なら false
    Function("play") { (name: String) -> Bool in
      KatsuHapticsPlayer.shared.play(name)
    }
  }
}
