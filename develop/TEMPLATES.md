# テンプレート集

ストア申請に必要なドキュメントのテンプレートです。

---

## store-listing-[locale].md テンプレート

ストア掲載情報は対応する各言語で作成してください。

```markdown
# Chrome Web Store Listing - [Language Name]

## Short Description (132 characters max)

[Main feature]. Supports [feature1], [feature2], [feature3].

(Characters: XX)

---

## Detailed Description

[Extension Name] is a Chrome extension for [main purpose]. Perfect for [target users].

### Key Features

**[Feature Category 1]**
- Feature detail 1
- Feature detail 2

**[Feature Category 2]**
- Feature detail 1
- Feature detail 2

### How to Use

1. Step 1
2. Step 2
3. Step 3

### Use Cases

- **[User Type 1]**: Usage example
- **[User Type 2]**: Usage example
- **[User Type 3]**: Usage example

### Privacy

- No data collection
- Everything runs locally in your browser
- No external servers

---

## Category

[Productivity / Developer Tools / etc.]

## Language

[Language Name]
```

> **Note**: ファイル名は `store-listing-ja.md`, `store-listing-en.md` のように言語コードをサフィックスに使用してください。

---

## PRIVACY_POLICY.md テンプレート

プライバシーポリシーは対応言語ごとにセクションを作成するか、言語別ファイルに分割してください。

```markdown
# Privacy Policy for [Extension Name]

**Last Updated: [Date]**

## Overview

[Extension Name] is a Chrome extension that [brief description]. This privacy policy explains how we handle your data.

## Data Collection

**We do not collect any personal data.**

This extension operates entirely locally within your browser. No data is transmitted to external servers.

## Data Storage

The extension may store the following information locally using Chrome's storage API:

- [Stored item 1 - e.g., User preferences]
- [Stored item 2 - e.g., Extension settings]

All data remains on your device and is never shared with third parties.

## Permissions Used

This extension requires the following permissions:

| Permission | Purpose |
|------------|---------|
| `[permission1]` | [Purpose] |
| `[permission2]` | [Purpose] |

## Third-Party Services

This extension does not use any third-party services or analytics.

## Data Sharing

We do not share, sell, or transfer any user data to third parties.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last Updated" date above.

## Contact

If you have any questions about this privacy policy, please contact us:

[Contact Method - e.g., GitHub Issues URL, Email]
```

> **Note**: 多言語対応が必要な場合は、同一ファイル内に `---` で区切って他言語版を追加するか、`PRIVACY_POLICY_[locale].md` として別ファイルを作成してください。

---

## messages.json テンプレート

`_locales/[locale]/messages.json` に配置します。

```json
{
  "extensionName": {
    "message": "[Extension Name in this language]",
    "description": "Name of the extension"
  },
  "extensionDescription": {
    "message": "[Description within 132 characters]",
    "description": "Description of the extension"
  }
}
```

> **Note**: `[locale]` は BCP 47 言語タグ（例: `en`, `ja`, `zh_CN`）を使用してください。

---

## アイコン生成プロンプトテンプレート

画像生成AIに使用するプロンプト：

```
Create a Chrome extension icon for "[Extension Name]".

Requirements:
- Size: 128x128 pixels
- Format: PNG with transparent background
- Style: Modern, minimalist, flat design
- Primary color: [color]
- Secondary color: [color]

The icon should represent [main concept] and include:
- [Visual element 1]
- [Visual element 2]

The design should be recognizable at small sizes (16x16) and work well against both light and dark backgrounds.
```

---

## 権限説明テンプレート

申請時に権限の正当性を説明するためのテンプレート：

| 権限 | 説明テンプレート |
|------|------------------|
| `tabs` | タブのタイトルとURLを取得し、[機能]を提供するために必要です |
| `storage` | ユーザーの設定をローカルに保存するために必要です |
| `activeTab` | 現在のタブで[機能]を実行するために必要です |
| `contextMenus` | 右クリックメニューから[機能]にアクセスするために必要です |
| `clipboardWrite` | [データ]をクリップボードにコピーするために必要です |
| `notifications` | [イベント]をユーザーに通知するために必要です |
