/**
 * ウィジェットでチェックしたら、その日のその項目の通知を止める(2026-11-27)。
 *
 * なぜ要るか: ウィジェットのボタンは iOS の AppIntent としてウィジェット側の別プロセスで動き、
 * 押した項目を App Group に残すだけ。アプリを開くまで通知の予約が引き直されないので、
 * 「チェックしたのに通知が鳴る」が起きていた(HANDOFF の既知の問題。1.0.4 では見送り)。
 *
 * やること: prebuild の前に expo-widgets の `ios/Widgets/AppIntent.swift` に書き足す。
 *   - ボタンの処理(WidgetUserInteraction.perform)の最後で、押した項目(props.checkedIds)の、
 *     表示の日(props.forDay)の通知を消す
 *   - 消すのは予約中の通知(「10分後にもう一度」も含む)と、もう届いている通知
 *   - 見分けるのは通知のデータ(routineId と forDay)。作る側は src/lib/notifications.ts の KatsuNotificationData。
 *     ⚠ 端末で予約した通知では、expo-notifications はデータを userInfo にそのまま入れる。
 *       userInfo["body"] に入るのはリモート通知だけ(NotificationRecords.swift の serializedNotificationData)。
 *       最初は "body" だけを見ていて、1件も消せていなかった(2026-11-27 の見直しで気づいた)
 *
 * ⚠ ライブラリのファイルを書き換えるので、expo-widgets を上げたら書き足す場所が変わっていないか確かめる。
 *   見つからなければ prebuild を止める(黙って直らないままにしない)。
 * ⚠ 書き足す前に、前に書き足した分(目印の付いた行と、末尾の KatsuWidgetNotifications)を取り除く。
 *   何度動かしても1回分だけになり、中身を直したときも当て直せる。
 * ⚠ ユーザーの言葉は見ない・出さない。見るのは ID と日付だけ。
 *
 * 手元で当てるだけなら: node plugins/with-widget-cancels-notifications.js
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const MARKER = '// KATSU: widget-cancels-notifications';

const IMPORT_ANCHOR = 'import WidgetKit\n';
const CALL_ANCHOR = '      WidgetsStorage.set(newTimeline, forKey: "__expo_widgets_\\(source)_timeline")\n';

const IMPORT_ADD = `import UserNotifications ${MARKER}\n`;
const CALL_ADD = `      await KatsuWidgetNotifications.cancel(props: newEntry["props"] as? [String: Any]) ${MARKER}\n`;
const HELPER = `
${MARKER}
/// ウィジェットで押した項目の、表示の日の通知(予約中・届いている分)を消す。
/// 通知のデータ({ routineId, forDay })は、端末で予約した通知なら userInfo にそのまま入っている。
/// 念のため userInfo["body"](リモート通知の入れ方)も見る
enum KatsuWidgetNotifications {
  static func cancel(props: [String: Any]?) async {
    guard let props,
          let forDay = props["forDay"] as? String,
          let checked = props["checkedIds"] as? [String],
          !checked.isEmpty else { return }
    let center = UNUserNotificationCenter.current()
    let matches: (UNNotificationContent) -> Bool = { content in
      let data = (content.userInfo["body"] as? [AnyHashable: Any]) ?? content.userInfo
      guard let routineId = data["routineId"] as? String,
            let day = data["forDay"] as? String else { return false }
      return day == forDay && checked.contains(routineId)
    }
    let pendingIds = await center.pendingNotificationRequests()
      .filter { matches($0.content) }
      .map(\\.identifier)
    if !pendingIds.isEmpty {
      center.removePendingNotificationRequests(withIdentifiers: pendingIds)
    }
    let deliveredIds = await center.deliveredNotifications()
      .filter { matches($0.request.content) }
      .map(\\.request.identifier)
    if !deliveredIds.isEmpty {
      center.removeDeliveredNotifications(withIdentifiers: deliveredIds)
    }
  }
}
`;

function appIntentPath(projectRoot) {
  const pkg = require.resolve('expo-widgets/package.json', { paths: [projectRoot] });
  return path.join(path.dirname(pkg), 'ios', 'Widgets', 'AppIntent.swift');
}

/** 前に書き足した分を取り除く(末尾の KatsuWidgetNotifications と、目印の付いた行) */
function unpatch(source) {
  const helperAt = source.indexOf(`\n${MARKER}\n`);
  const body = helperAt >= 0 ? source.slice(0, helperAt) : source;
  return body
    .split('\n')
    .filter((line) => !line.endsWith(` ${MARKER}`))
    .join('\n')
    .replace(/\n+$/, '\n');
}

/** AppIntent.swift に書き足す(前の分は取り除いてから)。中身が変わったら true */
function patchAppIntent(projectRoot) {
  const file = appIntentPath(projectRoot);
  const current = fs.readFileSync(file, 'utf8');
  const source = unpatch(current);
  if (!source.includes(IMPORT_ANCHOR) || !source.includes(CALL_ANCHOR)) {
    throw new Error(
      `[with-widget-cancels-notifications] ${file} の書き足す場所が見つからない。expo-widgets が変わった可能性がある。プラグインを直すまで prebuild しない`,
    );
  }
  const patched =
    source.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + IMPORT_ADD).replace(CALL_ANCHOR, CALL_ANCHOR + CALL_ADD) + HELPER;
  if (patched === current) return false;
  fs.writeFileSync(file, patched);
  return true;
}

const withWidgetCancelsNotifications = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      patchAppIntent(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);

module.exports = withWidgetCancelsNotifications;
module.exports.patchAppIntent = patchAppIntent;

if (require.main === module) {
  const changed = patchAppIntent(path.resolve(__dirname, '..'));
  console.log(changed ? 'AppIntent.swift に書き足した' : 'もう同じ中身が書き足してある');
}
