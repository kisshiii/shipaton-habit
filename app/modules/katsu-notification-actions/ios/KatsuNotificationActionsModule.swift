import ExpoModulesCore
import ExpoNotifications
import UIKit
import UserNotifications

/**
 * 通知の「10分後にもう一度」(1.0.3、plan §8 追加)をネイティブで予約する。
 *
 * ⚠ JS で予約しない理由: expo-notifications は `didReceive` の完了ハンドラをすぐに呼ぶので、
 *   アプリが裏で止まっている・終了しているときは JS が動く前に iOS がアプリを止め、予約が消える。
 *   ここは通知の応答を受けたその場で(JS を待たずに)予約する。
 *
 * ⚠ 本文・タイトル(本人が書いた言葉・ルーティン名)をログに出さないこと。
 * ⚠ アプリの保存データは読まない。済んだ・消したルーティン、消した言葉の分は、
 *   次に開いたときの JS の引き直し(`cancelPlanned`)が消す。
 * ⚠ 下の ID は `src/constants/notifications.ts` と同じ値にしておくこと。
 */
final class KatsuSnoozeDelegate: NotificationDelegate, @unchecked Sendable { // 状態は lock で守る
  static let shared = KatsuSnoozeDelegate()

  private static let snoozeAction = "snooze"         // ACTION_SNOOZE
  private static let routineCategory = "katsuRoutine" // ROUTINE_CATEGORY
  private static let snoozeIdPrefix = "katsuSnooze"   // SNOOZE_ID_PREFIX

  private let lock = NSLock()
  private var registered = false
  /// 同じ応答で二度予約しないため(届いた通知の ID)
  private var handledRequests = Set<String>()
  /**
   * 届け直すまでの秒数。JS の `SNOOZE_MINUTES` から `configure` で渡される。
   * ⚠ 600(10分)は configure が呼ばれる前だけの既定値。通知のボタンから冷起動すると、
   *   JS が動く前にここへ応答が来ることがあるため、値を持たずに待つことはできない。
   */
  private var snoozeSeconds: TimeInterval = 600

  /// 何度呼んでもよい。登録は1回だけ
  func register() {
    lock.lock()
    let already = registered
    registered = true
    lock.unlock()
    if already { return }
    NotificationCenterManager.shared.addDelegate(self)
  }

  func setSnoozeSeconds(_ seconds: TimeInterval) {
    guard seconds > 0 else { return }
    lock.lock()
    snoozeSeconds = seconds
    lock.unlock()
  }

  // MARK: - NotificationDelegate

  /**
   * ⚠ 常に false を返す(=「処理済み」と言わない)。
   *   true を返すと、JS がまだいないときに NotificationCenterManager が応答を保留せず、
   *   expo の EmitterModule(→ JS の lastNotificationResponse)に届かなくなる。
   * ⚠ completionHandler はここで呼ばない。NotificationCenterManager が全員に配ったあとで呼ぶ。
   */
  func didReceive(_ response: UNNotificationResponse, completionHandler: @escaping () -> Void) -> Bool {
    guard response.actionIdentifier == Self.snoozeAction else { return false }
    scheduleSnooze(of: response.notification.request)
    return false
  }

  // MARK: - 予約

  private func scheduleSnooze(of original: UNNotificationRequest) {
    let content = original.content
    guard let routineId = content.userInfo["routineId"] as? String, !routineId.isEmpty else { return }
    guard !content.body.isEmpty else { return }
    // 昨日の分は届け直さない(終わった日の分で煽らない)。forDay の無い古い通知はそのまま扱う
    if let forDay = content.userInfo["forDay"] as? String, forDay != Self.todayKey() { return }

    lock.lock()
    let isFirst = handledRequests.insert(original.identifier).inserted
    let seconds = snoozeSeconds
    lock.unlock()
    if !isFirst { return }

    let copy = UNMutableNotificationContent()
    copy.title = content.title
    copy.subtitle = content.subtitle
    copy.body = content.body
    copy.userInfo = content.userInfo
    copy.categoryIdentifier = content.categoryIdentifier.isEmpty ? Self.routineCategory : content.categoryIdentifier
    copy.sound = content.sound
    copy.threadIdentifier = content.threadIdentifier

    let epochMs = Int64((Date().timeIntervalSince1970 * 1000).rounded())
    let request = UNNotificationRequest(
      identifier: "\(Self.snoozeIdPrefix).\(routineId).\(epochMs)",
      content: copy,
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
    )

    // 応答を返したあと iOS がすぐアプリを止めても予約が終わるよう、少しだけ時間をもらう
    let task = Self.beginBackgroundTask()
    UNUserNotificationCenter.current().add(request) { error in
      if error != nil {
        // ⚠ 本文を出さない。エラーの中身も出さない
        NSLog("[KatsuNotificationActions] could not schedule the snooze")
      }
      Self.endBackgroundTask(task)
    }
  }

  /// JS の `toDateKey` と同じ、端末のローカル日付の "yyyy-MM-dd"
  private static func todayKey() -> String {
    let calendar = Calendar(identifier: .gregorian)
    let parts = calendar.dateComponents(in: TimeZone.current, from: Date())
    return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
  }

  private static func beginBackgroundTask() -> UIBackgroundTaskIdentifier {
    var task = UIBackgroundTaskIdentifier.invalid
    task = UIApplication.shared.beginBackgroundTask(withName: "katsuSnooze") {
      UIApplication.shared.endBackgroundTask(task)
      task = .invalid
    }
    return task
  }

  private static func endBackgroundTask(_ task: UIBackgroundTaskIdentifier) {
    guard task != .invalid else { return }
    DispatchQueue.main.async {
      UIApplication.shared.endBackgroundTask(task)
    }
  }
}

public class KatsuNotificationActionsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KatsuNotificationActions")

    // 通常はアプリの起動直後(下の AppDelegateSubscriber)で登録済み。念のためここでも呼ぶ(2回目は何もしない)
    OnCreate {
      KatsuSnoozeDelegate.shared.register()
    }

    /// 届け直すまでの秒数(JS の SNOOZE_MINUTES × 60)
    Function("configure") { (snoozeSeconds: Double) in
      KatsuSnoozeDelegate.shared.setSnoozeSeconds(snoozeSeconds)
    }
  }
}

/**
 * アプリの起動直後に登録する。
 * ⚠ モジュールの OnCreate だけだと、通知のボタンで冷起動したときに expo の EmitterModule が
 *   先に登録されて保留中の応答を受け取り、こちらに回ってこないことがある。
 */
public class KatsuNotificationActionsAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  @MainActor
  public func subscriberDidRegister() {
    KatsuSnoozeDelegate.shared.register()
  }
}
