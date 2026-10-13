import ExpoModulesCore
#if canImport(FoundationModels)
import FoundationModels
#endif

/**
 * Tier 2 ソフトガード(spec §2 / plan §6)。
 *
 * ユーザーが書いた言葉が「行動」ではなく「人格・存在」を否定しているかを、
 * 端末の中で動く Apple の言語モデル(Foundation Models)に聞く。
 *
 * ⚠ 端末の外に出さないこと。`SystemLanguageModel` だけを使う。
 *   Private Cloud Compute(`PrivateCloudComputeLanguageModel`)は Apple のサーバーに送るので使わない。
 * ⚠ 本文をログに出さない。返すのは判定の文字列だけ。
 * ⚠ 判定できないとき(非対応端末・Apple Intelligence がオフ・言語が非対応・拒否・エラー)は
 *   "unknown" を返す。ソフトガードは保存を止めないので、分からなければ何も言わない。
 */
public class KatsuSoftGuardModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KatsuSoftGuard")

    /// "available" / "unavailable"。画面の出し分けとテストのためだけに使う
    AsyncFunction("availability") { () -> String in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        return Self.isUsable() ? "available" : "unavailable"
      }
      #endif
      return "unavailable"
    }

    /// "person"(人格・存在を否定している) / "action"(行動を責めている、ほか) / "unknown"
    AsyncFunction("classify") { (text: String) async -> String in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        return await Self.classify(text)
      }
      #endif
      return "unknown"
    }
  }

  #if canImport(FoundationModels)
  /// 指示は英語で書く。日本語の文にもそのまま使える
  private static let instructions = """
    You read one short message that a person wrote to their future self, to be shown \
    when they skip a daily routine. Harsh, blunt or rude words are expected and fine.
    Decide only this: does the message attack the person's worth or existence \
    (for example calling them worthless, a failure as a person, hopeless, saying they \
    will never change or should not exist), or does it criticize an action or push them to act?
    Answer with exactly one word: PERSON or ACTION.
    """

  @available(iOS 26.0, *)
  private static func makeModel() -> SystemLanguageModel {
    // 書いた言葉をそのまま読む用途。既定の安全装置だと厳しい言葉で例外になり判定できない。
    // String で受け取る限り例外にはならず、断るときは断りの文が返る(→ unknown)
    SystemLanguageModel(guardrails: .permissiveContentTransformations)
  }

  @available(iOS 26.0, *)
  private static func isUsable() -> Bool {
    let model = makeModel()
    guard case .available = model.availability else { return false }
    return model.supportsLocale()
  }

  @available(iOS 26.0, *)
  private static func classify(_ text: String) async -> String {
    guard isUsable() else { return "unknown" }
    do {
      let session = LanguageModelSession(model: makeModel()) { instructions }
      let response = try await session.respond(
        to: text,
        options: GenerationOptions(sampling: .greedy, maximumResponseTokens: 4)
      )
      let answer = response.content.uppercased()
      let isPerson = answer.contains("PERSON")
      let isAction = answer.contains("ACTION")
      if isPerson && !isAction { return "person" }
      if isAction && !isPerson { return "action" }
      return "unknown"
    } catch {
      // ⚠ error に本文が含まれうるので、ログにも出さない
      return "unknown"
    }
  }
  #endif
}
