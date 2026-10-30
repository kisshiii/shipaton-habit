# App Store Connect API でできるマーケティング操作(2026-10 時点)

調べた日: 2026-10-30。対象は **App Store Connect API 4.5.1**(Apple が配布している OpenAPI 仕様 `openapi.oas.json` の `info.version` が `4.5.1`)。
小さな Node スクリプトから **ES256 の JWT(チーム API キー)** で操作する前提でまとめた。実際の API は呼んでいない(認証情報なし)。

- 根拠にしたのは Apple のページだけ。各項目に URL を付けた。Apple のページで確認できなかったことには **【未確認】** を付けた
- 型・必須項目・enum は、Apple 配布の OpenAPI 仕様(下記)と、各リファレンスページの両方で確かめた
  - OpenAPI 仕様: https://developer.apple.com/sample-code/app-store-connect/app-store-connect-openapi-specification.zip (リンク元: https://developer.apple.com/documentation/appstoreconnectapi/app-store-connect-api-release-notes )
- 表の `*` は OpenAPI 上の必須項目

---

## 0. 先に知っておくこと(全機能に共通)

### 0-1. 認証(JWT)

| 項目 | 値 |
|---|---|
| ヘッダー | `alg: ES256` / `kid: <Key ID>` / `typ: JWT` |
| ペイロード(チームキー) | `iss: <Issuer ID>` / `iat` / `exp` / `aud: "appstoreconnect-v1"` / `scope`(省略可) |
| 有効期間 | `exp - iat` が **20分を超えると拒否**。例外は GET だけの `scope` を付けたトークン(一部リソース) |
| レート制限 | レスポンスヘッダー `X-Rate-Limit: user-hour-lim:3500;user-hour-rem:500;`(1時間の移動窓。値は変わりうる)。超えると `429 RATE_LIMIT_EXCEEDED` |

- https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests
- https://developer.apple.com/documentation/appstoreconnectapi/identifying-rate-limits

**API キーの権限(ロール):**
- CPP / PPO / アプリ内イベント / ノミネーション: ヘルプには「Account Holder, Admin, App Manager, Marketing」と書いてある(各ヘルプページの "Required role")
- App Asset Library(後述。スクショ置き場): API では `ACCOUNT_HOLDER` / `ADMIN` / `APP_MANAGER` のどれか。**Marketing は入っていない**
  - https://developer.apple.com/documentation/appstoreconnectapi/understanding-the-app-asset-library
- Analytics Reports の**リクエスト作成は Admin だけ**。読むだけなら Sales and Reports / Finance でもよい(§7)
- → 1本のスクリプトで全部やるなら **Admin のチームキー**が手っ取り早い。読むだけの集計用には Sales and Reports のキーを分けて作る

### 0-2. 【重要】スクショのアップロード方式が 4.5.1 で変わった

4.5.1 で **App Asset Library** が追加された。これまでの「セットを作ってスクショを入れる」方式(`appScreenshotSets` / `appScreenshots` / `appPreviewSets` / `appPreviews` / `appEventScreenshots` / `appEventVideoClips`)は、**全部 deprecated** になった。

- https://developer.apple.com/documentation/appstoreconnectapi/app-store-connect-api-4-5-1-release-notes
- https://developer.apple.com/documentation/appstoreconnectapi/migrating-to-the-app-asset-library

新しい方式では、画像を**アプリ単位のライブラリに1回だけ上げ**、「どの面のどの枠に出すか」を **placement(配置)** として作る。対象にできる面は次の4つ:

- App Store バージョンのローカライズ
- CPP のローカライズ
- アプリ内イベントのローカライズ
- PPO のトリートメントのローカライズ

**新方式の手順(CPP・PPO・イベントで共通):**

1. `GET /v1/apps/{id}/assetLibrary` → ライブラリの `id` を取って保存する(アプリが続くかぎり変わらない)
2. `GET /v1/appAssetLibraryRefData` → 枠の種類・寸法・上限を読む。**ハードコードしない**(新しい端末が来ると、API のバージョンを上げずに追加されるため)
3. `POST /v1/appAssetLibraryImages` で場所を予約する(動画は `POST /v1/appAssetLibraryVideos`)
   - 必須: `fileName*` `fileSize*` `category*`、関係 `assetLibrary*`
   - `category`(**後から変えられない**):
     - `APP_SCREENSHOTS_AND_PREVIEWS`: スクショ・プレビュー用
     - `CREATIVE_ASSETS`: イベント画像・ヘッダー画像など
   - レスポンスに `uploadOperations[]` が入る(`method` / `url` / `offset` / `length` / `requestHeaders`)
4. 各 operation の URL に、指定どおりバイト列を PUT する。**JWT は付けない**(URL 自体が期限付きの認証になっている)。分割されていれば並列に送ってよい
5. `PATCH /v1/appAssetLibraryImages/{id}` に `{"uploaded": true}` だけを送る
   - 旧方式で必要だった **`sourceFileChecksum`(MD5)は不要**。代わりに、予約時の `fileSize` と実際に届いたバイト数が照合される
6. `GET /v1/appAssetLibraryImages/{id}` で `state` を見ながら待つ
   - 順に `AWAITING_UPLOAD` → `UPLOAD_COMPLETE` → `PREPARE_FOR_SUBMISSION`。最後の状態になったら配置できる
   - 失敗すると `FAILED` になり、理由は `stateDetails` に入る
   - 返ってきた `specId` を参照データと照らし、**意図した規格に一致したか**を確かめる
7. `POST /v1/appAssetLibraryPlacements` で配置する。中身は次の4点:
   - `placementType`(例: `APP_SCREENSHOT`)
   - `placementGroup`(例: `IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE`。参照データから読む文字列)
   - 素材の関係を**ちょうど1つ**: `image` か `video`
   - 配置先の関係を**ちょうど1つ**: `appStoreVersionLocalization` / `appCustomProductPageLocalization` / `appEventLocalization` / `appStoreVersionExperimentTreatmentLocalization`
8. `POST /v1/appAssetLibraryPlacementOrderingRequests` で、グループ内の並び順を一括で決める
   - 送るもの: `placementGroup` と、`orderedPlacements` に ID を並べた配列、配置先ローカライズの関係
   - **アプリ内イベントは並べ替えの対象外**(枠ごとに1枚しか置けないため)
9. 審査は「親」(バージョン / CPP / PPO / イベント)と一緒に通る。placement の `state` は親の審査状態をそのまま映す(`PARENT_PREPARE_FOR_SUBMISSION` … `PARENT_APPROVED`)

- https://developer.apple.com/documentation/appstoreconnectapi/uploading-and-managing-image-assets
- https://developer.apple.com/documentation/appstoreconnectapi/placing-assets-on-your-app-store-surfaces
- https://developer.apple.com/documentation/appstoreconnectapi/discovering-asset-specifications

**`AppAssetLibraryPlacementType` の値:**
`APP_SCREENSHOT`, `IMESSAGE_APP_SCREENSHOT`, `APP_PREVIEW`, `PRODUCT_PAGE_HEADER_ASSET`, `APP_STORE_SEARCH_RESULTS_ASSET`, `SEARCH_RESULTS_ADS_ASSET`, `TODAY_TAB_ADS_ASSET`, `EVENT_CARD_ASSET`, `EVENT_DETAILS_PAGE_ASSET`, `RETENTION_MESSAGE_ASSET`(OpenAPI 4.5.1 より)

**新方式で引っかかりやすい点:**

- **placement は作ったあと一切変えられない。**画像を差し替えたいときは、削除 → 作り直し → 並べ替え
- **削除の順番が旧方式と逆。**placement を消してから素材を消す。placement が残っていると `409 STATE_ERROR.ASSET_HAS_PLACEMENTS` になる
- **承認済みの親には placement を足せない**(`409 STATE_ERROR.INVALID_STATE`)。CPP なら新しい version を作ってから足す
- **枚数の上限は参照データの `features[].placementPolicies[].groupLimits[].maxCount` に入っている**
  - App Store バージョンは、グループごとにスクショ 10 / プレビュー 3 / ヘッダー 1
  - アプリ内イベントは、枠ごとに 1
  - **CPP と PPO は「別のポリシーを持つ」とだけ書かれていて、数字は載っていない** → 実行時に読む
- **アーカイブ(`archived: true`)できるのは承認済みの素材だけ**
- 旧方式(deprecated)は今も動く。ただし新しく書くコードは新方式で書くこと。旧方式の commit には `sourceFileChecksum`(元ファイル全体の MD5)が必要
  - https://developer.apple.com/documentation/appstoreconnectapi/uploading-assets-to-app-store-connect

### 0-3. 審査に出す方法(CPP・PPO・イベントで共通)

`reviewSubmissions` に `reviewSubmissionItems` を足して、`submitted: true` で出す。

1. `POST /v1/reviewSubmissions`
   - 関係 `app*`
   - 属性 `platform`(`IOS`)は省略可。ただしリリースノートには「PATCH で付けられる」とある
2. `POST /v1/reviewSubmissionItems`
   - 関係 `reviewSubmission*` と、次のうち**1つ**:
     - `appCustomProductPageVersion`
     - `appStoreVersionExperimentV2`(旧 v1 なら `appStoreVersionExperiment`)
     - `appEvent`
     - `appStoreVersion`
     - `appAssetLibraryImage` / `appAssetLibraryVideo`(素材だけを単独で審査に出すとき)
3. `PATCH /v1/reviewSubmissions/{id}` に `{"submitted": true}`。取り下げるときは `{"canceled": true}`
4. `ReviewSubmission.state` が取る値: `READY_FOR_REVIEW` / `WAITING_FOR_REVIEW` / `IN_REVIEW` / `UNRESOLVED_ISSUES` / `CANCELING` / `COMPLETING` / `COMPLETE`

- https://developer.apple.com/documentation/appstoreconnectapi/review-submissions
- https://developer.apple.com/documentation/appstoreconnectapi/post-v1-reviewsubmissionitems
- アプリのバージョンを付けずに出した場合は、**そのプラットフォームの最新の承認済みバージョンと一緒に審査される**
  - https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-a-custom-product-page
  - https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-event
- 素材を単独で出せるのは、承認済みのバージョンが既にあるときだけ。**素材が割り当てられた親が審査中のあいだは、その素材を単独では出せない**
  - https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-assets-from-asset-library

---

## 1. カスタムプロダクトページ(CPP) — **対応: yes**

### リソースとエンドポイント

| 操作 | エンドポイント |
|---|---|
| ページ作成 | `POST /v1/appCustomProductPages` |
| 変更(名前・公開/非公開) | `PATCH /v1/appCustomProductPages/{id}` |
| 一覧 | `GET /v1/apps/{id}/appCustomProductPages` |
| 削除 | `DELETE /v1/appCustomProductPages/{id}` |
| バージョン作成 | `POST /v1/appCustomProductPageVersions` |
| バージョン変更(deepLink) | `PATCH /v1/appCustomProductPageVersions/{id}` |
| ローカライズ作成 / 変更 / 削除 | `POST /v1/appCustomProductPageLocalizations`、`PATCH` / `DELETE /v1/appCustomProductPageLocalizations/{id}` |
| ローカライズの placement 一覧 | `GET /v1/appCustomProductPageLocalizations/{id}/placements` |
| **キーワード割り当て** | `POST /v1/appCustomProductPageLocalizations/{id}/relationships/searchKeywords` |
| キーワード解除 | `DELETE /v1/appCustomProductPageLocalizations/{id}/relationships/searchKeywords` |
| 割り当て済みキーワードの一覧 | `GET /v1/appCustomProductPageLocalizations/{id}/searchKeywords` |

- https://developer.apple.com/documentation/appstoreconnectapi/custom-product-pages-and-localizations
- https://developer.apple.com/documentation/appstoreconnectapi/post-v1-appcustomproductpages

### 属性と関係

**`AppCustomProductPageCreateRequest`**
- `attributes.name*`(参照名。App Analytics での表示名になる)
- 関係:
  - `app*`
  - `appCustomProductPageVersions`(省略可)
  - `appStoreVersionTemplate`(既存の App Store バージョンを下敷きにする)
  - `customProductPageTemplate`(既存の CPP を下敷きにする)
- `included[]` に `AppCustomProductPageVersionInlineCreate` と `AppCustomProductPageLocalizationInlineCreate` を入れれば、**ページ・バージョン・ローカライズを1回のリクエストで作れる**
- 読み取り専用: `url`(固有の URL)、`visible`(PATCH で変えられる)

**`AppCustomProductPageVersion`**
- `version`
- `state`: `PREPARE_FOR_SUBMISSION` / `READY_FOR_REVIEW` / `WAITING_FOR_REVIEW` / `IN_REVIEW` / `ACCEPTED` / `APPROVED` / `REPLACED_WITH_NEW_VERSION` / `REJECTED`
- `deepLink`
- 作成: 関係 `appCustomProductPage*`、属性 `deepLink`(省略可)

**`AppCustomProductPageLocalizationCreateRequest`**
- `locale*`、`promotionalText`、関係 `appCustomProductPageVersion*`、`placements`
- 旧方式の `appScreenshotSets` / `appPreviewSets` の関係は deprecated
  - https://developer.apple.com/documentation/appstoreconnectapi/app-custom-product-page-localizations

### キーワード割り当て(2025 年の機能) — **API にある**

- リソース: **`appKeywords`**(型名は `AppKeyword`)。関係名は **`searchKeywords`**。**API 4.1.0 から**使える
  - https://developer.apple.com/documentation/appstoreconnectapi/post-v1-appcustomproductpagelocalizations-_id_-relationships-searchkeywords
  - https://developer.apple.com/documentation/appstoreconnectapi/appkeyword
- 送る中身: `{"data":[{"type":"appKeywords","id":"..."}]}`(`AppCustomProductPageLocalizationSearchKeywordsLinkagesRequest`)。成功すると `204`
- 候補のキーワードは次の2つで取れる:
  - `GET /v1/apps/{id}/searchKeywords?filter[locale]=en-US&filter[platform]=IOS`
  - `GET /v1/appStoreVersionLocalizations/{id}/searchKeywords`
  - ヘルプの記述: CPP に割り当てられるのは「**最新の承認済みバージョン**のキーワード」
  - https://developer.apple.com/help/app-store-connect/create-custom-product-pages/configure-multiple-product-page-versions
- **`AppKeyword` には属性が無い**(`id` と `type` だけ)。**`id` がキーワードの文字列そのものなのか、不透明な ID なのかは【未確認】**
  - → コードでは、上の GET で返った `id` をそのまま使い、自分で組み立てないこと
- **検索結果に CPP が出るのは「承認済み」かつ「visible」のときだけ。**キーワードの割り当て自体はいつでもできる(同じヘルプページ)
- ヘルプの推奨: 「ページごとに重ならないキーワードを選ぶ」

### スクショの上げ方

§0-2 の新方式で、`appCustomProductPageLocalization` に配置する。並び順は `appAssetLibraryPlacementOrderingRequests` で決める(配置先は `appCustomProductPageLocalization`)。

### 審査への出し方

§0-3 の `reviewSubmissionItems.appCustomProductPageVersion` を使う。

### 上限

- **1アプリ 70 ページまで**
- CPP を作れるのは、アプリがどこかの国で Ready for Distribution になってから
- 表示されるのは iOS 15 以降
- deepLink が効くのは iOS 18 以降
- App Analytics に数字が出るのは**初回 DL が 5 件**に達してから
- 出典: https://developer.apple.com/help/app-store-connect/create-custom-product-pages/configure-multiple-product-page-versions

### 引っかかりやすい点

- **審査中はスクショ・プレビュー・プロモテキスト・キーワードを変えられない。**変えたいときは取り下げる
  - https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-a-custom-product-page
- 承認済みのページを直すときは**新しい version を作る**(URL は変わらない)。承認されると自動で差し替わる
- `promotionalText` だけは、いつでも更新できる(ローカライズのリソースページ)
- **主言語を変える場合**、CPP があると、CPP ごとにその言語のスクショが必要になる
  - https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information
- CPP ごとのスクショ枚数の上限は §0-2 の参照データで確かめる(App Store バージョンと同じ数とは限らない)

---

## 2. プロダクトページの最適化(PPO) — **対応: yes**

### リソースとエンドポイント

**今は v2 を使う。**v1(`/v1/appStoreVersionExperiments`)も残っているが、v1 は App Store バージョンにぶら下がる形。

| 操作 | エンドポイント |
|---|---|
| テスト作成 | `POST /v2/appStoreVersionExperiments` |
| 変更・**開始** | `PATCH /v2/appStoreVersionExperiments/{id}`(`name` / `trafficProportion` / `started`) |
| 取得 / 削除 | `GET` / `DELETE /v2/appStoreVersionExperiments/{id}` |
| アプリのテスト一覧 | `GET /v1/apps/{id}/appStoreVersionExperimentsV2` |
| トリートメント作成 / 変更 / 削除 | `POST /v1/appStoreVersionExperimentTreatments`、`PATCH` / `DELETE /v1/appStoreVersionExperimentTreatments/{id}` |
| トリートメント一覧 | `GET /v2/appStoreVersionExperiments/{id}/appStoreVersionExperimentTreatments` |
| トリートメントのローカライズ作成 / 削除 | `POST /v1/appStoreVersionExperimentTreatmentLocalizations`、`DELETE …/{id}` |
| ローカライズの placement 一覧 | `GET /v1/appStoreVersionExperimentTreatmentLocalizations/{id}/placements` |
| **勝ったトリートメントを本番に反映** | `POST /v1/appStoreVersionPromotions` |

- https://developer.apple.com/documentation/appstoreconnectapi/app-store-version-experiments
- https://developer.apple.com/documentation/appstoreconnectapi/app-store-version-experiment-treatments
- https://developer.apple.com/documentation/appstoreconnectapi/app-store-version-experiment-treatment-localizations
- https://developer.apple.com/documentation/appstoreconnectapi/app-store-version-promotions

### 属性と関係

**`AppStoreVersionExperimentV2CreateRequest`**
- `name*`、`platform*`(`IOS`)
- `trafficProportion*`(整数。テストに回すトラフィックの割合。百分率と読める【未確認】)
- 関係 `app*`
- 読み取り専用:
  - `state`: `PREPARE_FOR_SUBMISSION` / `READY_FOR_REVIEW` / `WAITING_FOR_REVIEW` / `IN_REVIEW` / `ACCEPTED` / `APPROVED` / `REJECTED` / `COMPLETED` / `STOPPED`
  - `reviewRequired`、`startDate`、`endDate`
  - 関係 `controlVersions` / `latestControlVersion`
- 開始するときは `PATCH` で `{"started": true}`
  - https://developer.apple.com/documentation/appstoreconnectapi/patch-v2-appstoreversionexperiments-_id_

**`AppStoreVersionExperimentTreatmentCreateRequest`**
- `name*`、`appIconName`(省略可)
- 関係: `appStoreVersionExperimentV2`(v1 なら `appStoreVersionExperiment`)
- 読み取り専用: `appIcon`(ImageAsset)、`promotedDate`

**`AppStoreVersionExperimentTreatmentLocalizationCreateRequest`**
- `locale*`、関係 `appStoreVersionExperimentTreatment*`、`placements`
- **ローカライズに文章の属性は無い**(説明文・名前などは無い)。PPO で試せるのは**アイコン・スクショ・プレビュー**
  - https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/overview-of-product-page-optimization
  - ※ Analytics ヘルプには「descriptions も試せる」と書いた箇所がある。ただし ASC ヘルプと API には対応する項目が無いので、API でできるのはアイコン・スクショ・プレビューと考える
  - https://developer.apple.com/help/app-store-connect-analytics/acquisition/product-page-optimization

**`AppStoreVersionPromotionCreateRequest`**
- 関係 `appStoreVersion*` と `appStoreVersionExperimentTreatment*`

### アイコンのテストには「バイナリ内の代替アイコン」が必要 — **必要**

ヘルプにこう書いてある:

> any app icons you wish to use must be part of the app binary for the current App Store version, which should be built with Xcode 13 or later and support alternate icons in asset catalogs

アイコンの大きさは 1024×1024。

- https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/configure-test-treatments

**`appIconName` に何を入れるか:** バイナリに入っている代替アイコンの名前。

- ビルドに含まれるアイコンは `GET /v1/builds/{id}/icons` で読める(`BuildIcon.name` / `iconType`)
- `IconAssetType` には `ALTERNATE_EXPERIMENT` という値がある
  - https://developer.apple.com/documentation/appstoreconnectapi/build-icons
- 「`iconType = ALTERNATE_EXPERIMENT` の `name` を `appIconName` に入れる」という対応は**【未確認】**(推測。Apple のページにはそう書かれていない)
- **KATSU への影響:** Expo のアプリで代替アイコンをバイナリに入れるには、ネイティブの設定が必要になる。アイコンのテストは**バイナリの更新(=審査)が前提**になる。スクショだけのテストならバイナリの変更は要らない

### スクショの上げ方

§0-2 の新方式で、`appStoreVersionExperimentTreatmentLocalization` に配置する。並べ替えもできる。

- 編集しなかった端末サイズは、元のページのスクショがそのまま使われる(configure-test-treatments)

### 審査への出し方

- メタデータに未承認のものがあるときは、§0-3 の `reviewSubmissionItems.appStoreVersionExperimentV2` で審査に出す
- 「スクショの並べ替えだけ」「アイコンだけ」なら既に承認済みなので、出し直さなくてよい
  - https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/run-a-test

### 上限

- トリートメントは**3つまで**
- テストは**最長 90 日**
- **止めたテストは再開できない**
- 結果が出るのは、テスト経由の初回 DL が 5 件に達してから
- 対象は iOS 15 以降
- **CPP には PPO を使えない**
- アプリが Ready for Distribution で、ストアに出ていることが条件
- 出典:
  - https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/create-a-test
  - https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/run-a-test
  - https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/overview-of-product-page-optimization
- 同時に走らせられるテストの数は**【未確認】**
  - Analytics ヘルプには「要素が重ならなければ別々のテストを同時に回せる」とある: https://developer.apple.com/help/app-store-connect-analytics/acquisition/product-page-optimization

### 引っかかりやすい点

- **トリートメントを反映しても、反映されるのはスクショとプレビューだけ。**アイコンは次のバージョンで既定のアイコンに変える必要がある
- 反映は**1テストにつき1回だけで、取り消せない**。テスト中に反映するとテストは自動で止まる
  - https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/apply-a-test-treatment-to-your-product-page
- テスト中に、テスト対象の要素を含む新バージョンを出すと、結果が歪む
- 1日あたりのトラフィックが少ないアプリでは、90 日では結論が出ないことが多い(「Likely to be Inconclusive」と表示される)

---

## 3. アプリ内イベント — **対応: yes**

### リソースとエンドポイント

| 操作 | エンドポイント |
|---|---|
| 作成 / 変更 / 削除 | `POST /v1/appEvents`、`PATCH` / `DELETE /v1/appEvents/{id}` |
| 一覧 | `GET /v1/apps/{id}/appEvents` |
| ローカライズ作成 / 変更 / 削除 | `POST /v1/appEventLocalizations`、`PATCH` / `DELETE /v1/appEventLocalizations/{id}` |
| ローカライズの placement 一覧 | `GET /v1/appEventLocalizations/{id}/placements` |
| (deprecated)画像 / 動画 | `POST /v1/appEventScreenshots`(`appEventAssetType`: `EVENT_CARD` / `EVENT_DETAILS_PAGE`)、`POST /v1/appEventVideoClips` |

- https://developer.apple.com/documentation/appstoreconnectapi/app-events-and-metadata
- https://developer.apple.com/documentation/appstoreconnectapi/appevent/attributes-data.dictionary

### 属性(`AppEventCreateRequest`)

| 属性 | 型 / 値 | メモ |
|---|---|---|
| `referenceName*` | string | ASC の中でだけ見える名前。**64 文字まで、アプリ内で重複不可** |
| `badge` | `LIVE_EVENT` / `PREMIERE` / `CHALLENGE` / `COMPETITION` / `NEW_SEASON` / `MAJOR_UPDATE` / `SPECIAL_EVENT` | |
| `purpose` | `APPROPRIATE_FOR_ALL_USERS` / `ATTRACT_NEW_USERS` / `KEEP_ACTIVE_USERS_INFORMED` / `BRING_BACK_LAPSED_USERS` | |
| `priority` | `HIGH` / `NORMAL` | `HIGH` は `NORMAL` より先に並ぶ。同じ優先度の中では開始の早い順 |
| `purchaseRequirement` | string(`NO_COST_ASSOCIATED` / `IN_APP_PURCHASE`) | サブスクのアプリでは、**そのイベントだけの追加課金があるときだけ** IAP を選ぶ |
| `primaryLocale` | string | ユーザーの言語のローカライズが無いときに出る言語 |
| `deepLink` | uri | Universal Link を推奨。短縮 URL は避ける |
| `territorySchedules[]` | `{ territories[], publishStart, eventStart, eventEnd }`(date-time) | 国ごとに日時を変えられる |
| 関係 `app*` | | |
| 読み取り専用 `eventState` | `DRAFT` / `READY_FOR_REVIEW` / `WAITING_FOR_REVIEW` / `IN_REVIEW` / `REJECTED` / `ACCEPTED` / `APPROVED` / `PUBLISHED` / `PAST` / `ARCHIVED` | |

- バッジの意味(Apple の定義): https://developer.apple.com/help/app-store-connect/reference/in-app-events/in-app-event-badges
  - `CHALLENGE` = "Activities encouraging the user to achieve a goal before the event ends"

**`AppEventLocalizationCreateRequest`**
- `locale*`、`name`、`shortDescription`、`longDescription`、関係 `appEvent*`、`placements`

### 文字数の上限

上限は**ヘルプにだけ**書いてあり、OpenAPI 側に `maxLength` は無い。

| 項目 | 上限 | どこに出るか |
|---|---|---|
| `name` | **30 文字** | ストア上のイベント名 |
| `shortDescription` | **50 文字** | イベントカード(Today タブ・検索など) |
| `longDescription` | **120 文字** | イベント詳細ページ |
| `referenceName` | 64 文字 | ASC の中だけ |

- https://developer.apple.com/help/app-store-connect/offer-in-app-events/offer-in-app-events

### 日付のルール

| 項目 | ルール |
|---|---|
| `eventStart` | 未来の日時ならいつでもよい |
| `eventEnd` | **開始から最大 31 日**。イベントは**最低 15 分** |
| `publishStart` | ストアに出始める日時。**開始の最大 14 日前**まで |
| 国ごとの開始日時 | 国によって変えるときは、**すべての開始日時が 48 時間以内**に収まっていること |
| 開始日時が重なる件数 | 承認済み・下書きを合わせて**10 件まで** |

- https://developer.apple.com/help/app-store-connect/offer-in-app-events/offer-in-app-events

### 画像・動画の規格

| 種類 | 拡張子 | 比率 | 最小 | 最大 | サイズ上限 |
|---|---|---|---|---|---|
| イベントカード画像 | .jpg .jpeg .png | **16:9(横長)** | 1920×1080 | 3840×2160 | 500MB |
| イベントカード動画 | .mov .m4v .mp4 | 16:9 | 1920×1080(30/60fps) | 3840×2160(30/60fps) | 500MB |
| 詳細ページ画像 | .jpg .jpeg .png | **9:16(縦長)** | 1080×1920 | 2160×3840 | 500MB |
| 詳細ページ動画 | .mov .m4v .mp4 | 9:16 | 1080×1920(30/60fps) | 2160×3840(30/60fps) | 500MB |

- 音声: カード動画は AAC 256kbps、詳細ページ動画は PCM か AAC 256kbps。どちらもステレオ、44.1/48kHz、無音のトラックでもよい
- https://developer.apple.com/help/app-store-connect/reference/in-app-events/in-app-event-media-and-audio-specifications

**API での上げ方:**
- §0-2 の新方式で、`category: CREATIVE_ASSETS` として上げる
- `placementType` は `EVENT_CARD_ASSET` / `EVENT_DETAILS_PAGE_ASSET`。配置先は `appEventLocalization`
- **枠ごとに 1 つまで、並べ替えはできない**
- `placementGroup` の具体的な値は参照データで確かめる【未確認】

### 審査への出し方

§0-3 の `reviewSubmissionItems.appEvent` を使う。

- アプリに承認済みのバージョンがまだ無いときは、最初のバージョンと同じ申請に入れる必要がある
- https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-event

### 上限

- ストアに**同時に公開できるのは 10 件**
- **承認済みとして持てるのは 15 件**まで
- 表示されるのは iOS のみ
- 出典: https://developer.apple.com/help/app-store-connect/offer-in-app-events/offer-in-app-events

### 引っかかりやすい点

- `territorySchedules` は配列ごと置き換わるものと思われる【未確認】。PATCH するときは全体を送るのが安全
- イベントの日時は審査に通ったあとでしか効かない。publishStart までに承認が間に合うよう、余裕をもって出す
- **KATSU の考え方との関係**(CLAUDE.md の「罪悪感をあおる通知や演出はしない」): `BRING_BACK_LAPSED_USERS` を使っても、ユーザーに直接届くのはストア上の表示だけ。ただしイベントの文言は Today タブにも出る。煽る言い回しにしないこと。どのイベントを出すかは plan.md の範囲で決める

---

## 4. 自動更新サブスクのオファーコード — **対応: yes**

### リソースとエンドポイント

| 操作 | エンドポイント |
|---|---|
| オファー(コードの入れ物)作成 | `POST /v1/subscriptionOfferCodes` |
| オファーの無効化 | `PATCH /v1/subscriptionOfferCodes/{id}`(`active: false`) |
| サブスクのオファー一覧 | `GET /v1/subscriptions/{id}/offerCodes` |
| 国ごとの価格一覧 | `GET /v1/subscriptionOfferCodes/{id}/prices` |
| **使い捨てコード**の発行 | `POST /v1/subscriptionOfferCodeOneTimeUseCodes` |
| 使い捨てコードの値を CSV で取得 | `GET /v1/subscriptionOfferCodeOneTimeUseCodes/{id}/values` |
| 使い捨てコードの無効化 | `PATCH /v1/subscriptionOfferCodeOneTimeUseCodes/{id}`(`active`) |
| **カスタムコード**の作成 | `POST /v1/subscriptionOfferCodeCustomCodes` |
| カスタムコードの無効化 | `PATCH /v1/subscriptionOfferCodeCustomCodes/{id}`(`active`) |

- https://developer.apple.com/documentation/appstoreconnectapi/subscription-offer-codes

### 属性

**`SubscriptionOfferCodeCreateRequest`**
- `name*`(参照名。Sales and Trends と StoreKit のトランザクションに出る)
- `customerEligibilities*`: `NEW` / `EXISTING` / `EXPIRED` の配列
- `offerEligibility*`: `STACK_WITH_INTRO_OFFERS` / `REPLACE_INTRO_OFFERS`
- `duration*`: `THREE_DAYS` / `ONE_WEEK` / `TWO_WEEKS` / `ONE_MONTH` / `TWO_MONTHS` / `THREE_MONTHS` / `SIX_MONTHS` / `ONE_YEAR`
- `offerMode*`: `PAY_AS_YOU_GO` / `PAY_UP_FRONT` / `FREE_TRIAL`
- `numberOfPeriods*`
- `autoRenewEnabled`(省略可。false にすると「自動更新しないお試し」になり、**選べるのは無料だけ**)
- `targetSubscriptionPlanType`(省略可)
- 関係: `subscription*`、`prices*`
  - `prices` の中身は `included[]` の `SubscriptionOfferCodePriceInlineCreate` で渡す。各要素は `territory` と `subscriptionPricePoint` を持つ
- 読み取り専用: `totalNumberOfCodes` / `productionCodeCount` / `sandboxCodeCount` / `active`

**`SubscriptionOfferCodeOneTimeUseCodeCreateRequest`**
- `numberOfCodes*`、`expirationDate*`(date)
- `environment`: `PRODUCTION` / `SANDBOX`
- 関係 `offerCode*`

**`SubscriptionOfferCodeCustomCodeCreateRequest`**
- `customCode*`、`numberOfCodes*`(= 使える人数の上限)
- `expirationDate`(省略可。省略すると期限なし)
- 関係 `offerCode*`

### 上限

出典: https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes

**全体:**
- 引き換えの総数は、**1アプリにつき四半期 100 万件まで**(全サブスク合算)
- 有効なオファーは**サブスク SKU ごとに 10 件まで**
- 1人の顧客が使えるのは、**1つのオファーにつき 1 コード**

**使い捨てコード:**
- 1回に発行できるのは **500〜25,000 件**(もっと必要なら複数回に分けて発行する)
- **期限は最長 6 か月**
- 期限は太平洋時間の 0 時に切れる
- サンドボックス用は 10〜10,000 件

**カスタムコード:**
- **64 文字以内、特殊文字は使えない**
- 1回で付けられる引き換え上限は 25,000 まで
- 期限は任意。付けるなら最長 6 か月
- **作ったら編集できない**
- 同じアプリの別のオファーで使っているコード名は、そちらを無効にするまで使えない
- 期限を延ばしたいときは、同じコード名で新しい期限の組を作る(古い組から先に消費される)

**共通:**
- 引き換えられるようになるまで**最大 1 時間**かかる
- **作ったオファーは編集できない**(対象者を変えたいときは新しく作る)
- 無効にしたオファーは再び有効にできない

### 審査への出し方

不要。オファーコードは審査の対象ではない。ただし**使い捨てコードを引き換えるには、アプリが Ready for Sale であること**が条件(同じヘルプページ)。

### 引っかかりやすい点

- **アプリ内で引き換えさせるには StoreKit 側の実装が要る。**KATSU は RevenueCat 経由なので、RevenueCat のコード引き換え画面に対応しているかは別に確認する【未確認】。Apple のページで確認できるのは、iOS 14 以降なら引き換え用 URL や App Store のコード入力からでも使えることまで
  - https://developer.apple.com/documentation/storekit/supporting-offer-codes-in-your-app
- 使い捨てコードの値は CSV で返る(`GET …/values`)。**レスポンスは JSON ではない**
- 「3つの価格から選ぶ月額サブスク」という KATSU の課金の形は変えないこと(CLAUDE.md)。オファーコードは割引・お試しの入口として使うものなので、この形は崩れない

---

## 5. 既存バージョンへのローカライズ追加(en-GB / en-AU / en-CA など) — **対応: yes**

### リソースとエンドポイント

ローカライズは2か所に分かれている。

| 何を | リソース | 作成 | 変更 |
|---|---|---|---|
| **名前・サブタイトル**・プライバシー URL(アプリ全体で共有) | `appInfoLocalizations` | `POST /v1/appInfoLocalizations`(`locale*`、`name*`、`subtitle`、`privacyPolicyUrl`…、関係 `appInfo*`) | `PATCH /v1/appInfoLocalizations/{id}` |
| **説明・キーワード**・プロモテキスト・What's New・URL(バージョンごと) | `appStoreVersionLocalizations` | `POST /v1/appStoreVersionLocalizations`(`locale*`、`description`、`keywords`、`promotionalText`、`whatsNew`、`supportUrl`、`marketingUrl`、関係 `appStoreVersion*`、`placements`) | `PATCH /v1/appStoreVersionLocalizations/{id}` |

- `appInfo` の id は `GET /v1/apps/{id}/appInfos` で取る。編集できる状態のもの(審査に出す前の版)を選ぶ【未確認: 判別に使う属性名】
- `keywords` は**カンマ区切りの1つの文字列**。旧来の属性で、今も残っている
- 別に `searchKeywords` の関係(`POST /v1/appStoreVersionLocalizations/{id}/relationships/searchKeywords`)も用意されている
  - 両者の関係(どちらが正なのか)は**【未確認】**。当面は `keywords` 文字列で書き、`searchKeywords` は読むだけにする
  - https://developer.apple.com/documentation/appstoreconnectapi/post-v1-appstoreversionlocalizations-_id_-relationships-searchkeywords
- 文字数の上限:
  - 名前: 2〜30 文字
  - サブタイトル: 30 文字
  - **キーワード: 100 バイト**(文字数ではない。日本語は1文字3バイト)。1語は3文字以上
  - プロモテキスト: 170 文字
  - 説明: 4000 文字
  - What's New: 4000 文字
  - 出典:
    - https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
    - https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information

**API で使うロケールコード:**
- `en-US` / `en-GB` / `en-AU` / `en-CA` / `ja`
- (他の例)`fr-CA` / `es-MX` / `zh-Hans`
- 一覧: https://developer.apple.com/documentation/appstoreconnectapi/managing-metadata-in-your-app-by-using-locale-shortcodes

### どのストアフロントがどの言語のメタデータを使うか

Apple の公式な表(**Default language / Additional supported language(s)**)から、目標地域(英語圏と日本、plan §7)に関わる国を抜き出した:

| 国 | 既定の言語 | 追加で対応する言語 |
|---|---|---|
| USA | English (US) | Arabic, Chinese (Simplified), Chinese (Traditional), French, Korean, Portuguese (Brazil), Russian, Spanish (Mexico), Vietnamese |
| GBR | English (U.K.) | — |
| CAN | English (Canada) | French (Canada) |
| AUS | English (Australia) | English (U.K.) |
| NZL | English (Australia) | English (U.K.) |
| IRL | English (U.K.) | — |
| SGP | English (U.K.) | Chinese (Simplified) |
| IND | English (U.K.) | Bangla, Gujarati, Hindi, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu, Urdu |
| PHL / ZAF | English (U.K.) | — |
| **JPN** | **Japanese** | **English (US)** |

- 出典: https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations
- 表に載っている 175 の国・地域のうち、ほとんどは **English (U.K.)** が既定か追加言語になっている。en-GB を作ると、多くの国に効く
- **この表は「どの言語を表示するか」の表。「検索キーワードとしてどの言語が索引されるか」は Apple のページに書かれていない**
  - ASO の世間でよく言われる「追加言語のキーワードもその国で索引される」という説は **【未確認】**
- 表示される言語は、ストアの言語・端末の言語・追加済みの言語・主言語の組み合わせで決まる(同じページ)
- 英語しか登録していなければ、どの国でも英語で表示される
  - https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information
- 日本のストアでは English (US) が追加言語になっている。そのため、**日本のストアで en-US のキーワードも効くかどうかは【未確認】**

### スクショの上げ方

§0-2 の新方式で、`appStoreVersionLocalization` に配置する。同じ画像を複数のロケールに置いても、アップロードは1回で済む。

- ASC の画面で言語を足すと、スクショなどは主言語のものが引き継がれる(説明とキーワードは引き継がれない)
- **API で足したときにも同じように引き継がれるかは【未確認】**
- https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information

### 審査への出し方

新しいローカライズは、**編集できる状態(`PREPARE_FOR_SUBMISSION`)のバージョンにしか足せない**(「You can manage languages only when the app status is editable」)。普通のバージョン審査(`reviewSubmissionItems.appStoreVersion`)に乗せて出す。

- 名前・サブタイトルの変更も、新しいバージョンと一緒に審査される
- プロモテキストはいつでも変えられる
  - https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties

### 引っかかりやすい点

- **en-GB などを足しても、バイナリのローカライズとは関係ない。**ストアのメタデータの話だけ
- ローカライズを消すと、その言語を使っていた国は主言語の表示に戻る
- `keywords` のバイト数は自分で数える(`Buffer.byteLength(str, 'utf8') <= 100`)。API が手前で弾いてくれるかは【未確認】

---

## 6. Featuring のノミネーション — **対応: yes(API がある)**

「API は無い」と思われがちだが、**`nominations` リソースがある**(API 3.8 で追加。https://developer.apple.com/documentation/appstoreconnectapi/app-store-connect-api-3-8-release-notes )。

| 操作 | エンドポイント |
|---|---|
| 作成 | `POST /v1/nominations` |
| 一覧 | `GET /v1/nominations`(**`filter[state]` が必須**: `DRAFT` / `SUBMITTED` / `ARCHIVED`) |
| 取得 / 変更 / 削除 | `GET` / `PATCH` / `DELETE /v1/nominations/{id}` |

- https://developer.apple.com/documentation/appstoreconnectapi/featuring-nominations
- https://developer.apple.com/documentation/appstoreconnectapi/post-v1-nominations
- https://developer.apple.com/documentation/appstoreconnectapi/get-v1-nominations

### 属性(`NominationCreateRequest`)

- `name*`
- `type*`: `APP_LAUNCH` / `APP_ENHANCEMENTS` / `NEW_CONTENT`
- `description*`
- **`submitted*`(boolean)**: false なら下書き、true なら提出
- `publishStartDate*`(date-time)、`publishEndDate`(省略可。期間で示すとき)
- `deviceFamilies[]`、`locales[]`、`supplementalMaterialsUris[]`
- `hasInAppEvents`、`launchInSelectMarketsFirst`、`notes`、`preOrderEnabled`
- 関係: **`relatedApps*`**(apps の配列)、`inAppEvents`、`supportedTerritories`
- 更新(`NominationUpdateRequest`)では、上に加えて `archived` が使える

### 上限

上限はヘルプと CSV テンプレートにしか書かれていない。

- 名前: 60 文字
- 説明: 1,000 文字
- 補足(Helpful Details → API では `notes` と思われる【未確認】): 500 文字
- 関連アプリ: 合計 10 件まで
- 補足資料の URL: 5 件まで
- 紐付けるイベント: CSV では 25 件まで
- **少なくとも 3 週間前**に出すよう推奨されている
- 提出したあとは**種別と関連アプリを変えられない**
- 提出済みのものは、アーカイブしてからでないと削除できない
- アーカイブしたら元に戻せない
- 出典:
  - https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring
  - https://developer.apple.com/help/app-store-connect/reference/nominations/nominations-template

### 審査

App Review の対象ではない(編集部が見る)。採用されたときの連絡はメールで来る(テンプレートページ)。

### 引っかかりやすい点

- 紐付けられるイベントは、**承認済みか公開済みのものだけ**
- 一覧は `filter[state]` を付けないと 400 になる(仕様で必須になっている)

---

## 7. キャンペーンリンク(pt / ct)と App Analytics の読み出し

### 7-1. キャンペーンリンク — **API での作成: no(ASC の画面だけ)**

- OpenAPI 4.5.1 に `campaign` を含むリソースは無い。キャンペーンリンクは **ASC の Analytics → Acquisition → Campaigns** で作る
- 形式: `https://apps.apple.com/app/apple-store/id<APPLE_ID>?pt=<PROVIDER_TOKEN>&ct=<CAMPAIGN_TOKEN>&mt=8`

| トークン | 意味 |
|---|---|
| `pt` | **開発者アカウント単位で1つ**。最初にリンクを作ったときに発行され、その後も変わらない。**自分で作ることはできない** |
| `ct` | キャンペーン名そのもの。英数字と空白、許可された記号で **30 文字以内**。先頭と末尾に空白は置けない |
| `mt` | メディアの種類(アプリは `8`) |

- 一度 `pt` を手に入れてしまえば、**`ct` を変えた URL を自分で組み立てて使える**(Apple も「`ct` だけ変えて使い回す」と書いている)。Smart App Banner や `SKStoreProductViewController` にも同じトークンを渡せる
- 計測のルール:
  - リンクを踏んでから **24 時間以内の初回 DL** が、そのキャンペーンに数えられる
  - 複数のリンクを踏んだ場合は、最後に踏んだものが数えられる
- 画面に出る条件:
  - **キャンペーンが出るのは公開から 24 時間以上たってから**
  - 指標の値が **5 以上**でないと出ない
  - **アプリにまだ分析データが無いあいだは、キャンペーンを作ること自体ができない**
- URL に `/us/` などの国を入れても、ユーザーは自分の国のストアに飛ばされる
- 出典: https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links

### 7-2. Analytics Reports API — **対応: yes(読み出しだけ)**

| 手順 | エンドポイント |
|---|---|
| ① 生成を頼む(Admin だけ) | `POST /v1/analyticsReportRequests`(`accessType*`: `ONGOING` か `ONE_TIME_SNAPSHOT`、関係 `app*`) |
| ② 頼んだものの一覧 | `GET /v1/apps/{id}/analyticsReportRequests` |
| ③ レポートの一覧 | `GET /v1/analyticsReportRequests/{id}/reports`(`filter[category]` / `filter[name]`) |
| ④ インスタンス(日・週・月) | `GET /v1/analyticsReports/{id}/instances`(`filter[granularity]` / `filter[processingDate]`) |
| ⑤ セグメント(実際のファイル) | `GET /v1/analyticsReportInstances/{id}/segments` → `url` / `checksum` / `sizeInBytes` |
| 取り消し | `DELETE /v1/analyticsReportRequests/{id}` |

- `AnalyticsReport.category` が取る値: `APP_USAGE` / `APP_STORE_ENGAGEMENT` / `COMMERCE` / `FRAMEWORK_USAGE` / `PERFORMANCE`
- ファイルは **gzip した TSV(.txt.gz)**
- 出典:
  - https://developer.apple.com/documentation/appstoreconnectapi/analytics
  - https://developer.apple.com/documentation/appstoreconnectapi/downloading-analytics-reports
  - https://developer.apple.com/help/app-store-connect-analytics/overview/analytics-reports-api

**見たい数字がどのレポートに入っているか:**

| 見たいもの | レポート名(`name`) | 中身 |
|---|---|---|
| **インプレッション・ページビュー・タップ**(流入元別) | **App Store Discovery and Engagement**(Standard / Detailed) | `Event` = `Impression` / `Page view` / `Tap`。`Source Type` = `App Store search` / `App Store browse` / `App referrer` / `Web referrer` / `App Clip` / `Notification` / `Unavailable`。`Page Type`(Product page / In-app event / Store sheet …)、`Engagement Type`(Get / Open / IAE reminder …)、`Territory`、`Counts` / `Unique Counts` |
| **DL 数**(流入元別) | **App Store Downloads**(Standard / Detailed) | `Download Type` = `First-time Download` / `Redownload` / `Manual update` / `Auto-update` / `Restore`。`Source Type`、`Page Type`、`Territory`、`Counts` |
| **キャンペーン別・CPP 別** | 上の2つの **Detailed** 版だけ | `Campaign`(= ct。**2024-11-19 以降の列**)、`Page Title`(CPP の参照名 / default product page)、`Source Info`(参照元のアプリ・サイト) |

- https://developer.apple.com/documentation/analytics-reports/app-store-discovery-and-engagement
- https://developer.apple.com/documentation/analytics-reports/app-download
- CPP 別・キャンペーン別のデータは Detailed 版にしか無い:
  - https://developer.apple.com/help/app-store-connect-analytics/acquisition/custom-product-pages
  - https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links

**引っかかりやすい点:**

- **最初のレポートができるまで 1〜2 日。**その後、`ONGOING` は毎日できる
  - 週次は毎週金曜に前の週(月〜日)の分
  - 月次は翌月 5 日
  - 1日分のデータが揃うのは 2〜3 日後
- **インスタンスは 35 日で消える。**取りこぼした分は `ONE_TIME_SNAPSHOT` で取り直す(**月に 1 回まで**)
  - 長いあいだ取得しないでいると、リクエストが `stoppedDueToInactivity` になって止まる
  - https://developer.apple.com/documentation/analytics-reports
- **Detailed 版は「5 ユーザー未満の行を落とす」+「ノイズを足す」**(約 68% の値が ±2 以内)
  - 小さいアプリでは、キャンペーン別・CPP 別の行が**ほとんど出ない**ことを前提にしておく
  - https://developer.apple.com/documentation/analytics-reports/privacy
- 過去のデータは **2024-01-01 から**しか無い
- **列の位置は変わることがある。**列は名前で読むこと。値の大文字・小文字は区別されない
- PPO の結果(信頼度・リフト)を API で取れるかは**【未確認】**(Analytics Reports の一覧に PPO 専用のレポートは無い)

---

## まとめ(スクリプトを書く人向け)

| 機能 | API | 使うリソース | スクショ | 審査 |
|---|---|---|---|---|
| CPP | yes | `appCustomProductPages` → `…Versions` → `…Localizations` | Asset Library の placement | `reviewSubmissionItems.appCustomProductPageVersion` |
| CPP のキーワード | yes(4.1.0〜) | `…Localizations/{id}/relationships/searchKeywords` + `appKeywords` | — | CPP と一緒(検索に出るのは承認済み + visible のときだけ) |
| PPO | yes | `v2/appStoreVersionExperiments` → `…Treatments` → `…TreatmentLocalizations`、反映は `appStoreVersionPromotions` | Asset Library の placement | `reviewSubmissionItems.appStoreVersionExperimentV2` → `PATCH started:true` |
| PPO のアイコン | partial | `appIconName`(バイナリ内の代替アイコンが必要) | — | アイコンを入れたバイナリを先に出す |
| アプリ内イベント | yes | `appEvents` → `appEventLocalizations` | Asset Library(`EVENT_CARD_ASSET` / `EVENT_DETAILS_PAGE_ASSET`) | `reviewSubmissionItems.appEvent` |
| オファーコード | yes | `subscriptionOfferCodes` → `…OneTimeUseCodes` / `…CustomCodes` | — | 不要 |
| ローカライズ追加 | yes | `appInfoLocalizations`(名前・サブタイトル)/ `appStoreVersionLocalizations`(説明・キーワード) | Asset Library の placement | バージョン審査 |
| ノミネーション | yes | `nominations`(`submitted: true` で提出) | — | 審査ではない(編集部) |
| キャンペーンリンク | **no** | ASC の画面で作る(`pt` は1回だけ取得、`ct` は自由) | — | — |
| Analytics の読み出し | yes(読むだけ) | `analyticsReportRequests` → `reports` → `instances` → `segments` | — | — |

**最初に一度だけやること:**
1. Admin のチームキーを作る
2. `GET /v1/apps/{id}/assetLibrary` でライブラリの ID を取る
3. `GET /v1/appAssetLibraryRefData` で枠の一覧を取る(起動のたびに取り直す)
4. `POST /v1/analyticsReportRequests`(`ONGOING`)を出しておく(届くまで 1〜2 日)
5. ASC の画面でキャンペーンリンクを1つ作り、`pt` を控える
