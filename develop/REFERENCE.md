# 技術リファレンス

Chrome拡張機能開発のための技術参照情報です。

---

## Manifest V3 基本構成

```json
{
  "manifest_version": 3,
  "name": "__MSG_extensionName__",
  "description": "__MSG_extensionDescription__",
  "version": "1.0.0",
  "default_locale": "[locale]",

  "icons": {
    "16": "icon-16.png",
    "48": "icon-48.png",
    "128": "icon-128.png"
  },

  "action": {
    "default_icon": {
      "16": "icon-16.png",
      "48": "icon-48.png",
      "128": "icon-128.png"
    },
    "default_title": "__MSG_extensionName__",
    "default_popup": "popup.html"
  },

  "permissions": [],

  "background": {
    "service_worker": "background.js"
  }
}
```

---

## よく使う Permissions

| Permission | 用途 | 審査時の注意 |
|------------|------|--------------|
| `storage` | データ保存 | 低リスク |
| `activeTab` | 現在タブアクセス | 低リスク |
| `tabs` | タブ情報取得 | 用途説明必要 |
| `tabGroups` | タブグループ操作 | 用途説明必要 |
| `contextMenus` | 右クリックメニュー | 低リスク |
| `notifications` | 通知表示 | 低リスク |
| `clipboardWrite` | クリップボード書込 | 用途説明必要 |
| `clipboardRead` | クリップボード読取 | 高リスク、要正当化 |
| `bookmarks` | ブックマーク操作 | 用途説明必要 |
| `history` | 履歴アクセス | 高リスク、要正当化 |

### Host Permissions

特定サイトへのアクセスが必要な場合：

```json
"host_permissions": [
  "https://*.example.com/*",
  "https://api.service.com/*"
]
```

---

## Content Security Policy

外部リソースを使用する場合のCSP設定：

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com"
}
```

---

## アイコン要件

| サイズ | 用途 | 必須 |
|--------|------|------|
| 16x16 | ツールバー、ファビコン | Yes |
| 48x48 | 拡張機能管理画面 | Yes |
| 128x128 | Chrome Web Store、インストール時 | Yes |

### 形式要件

- **PNG形式必須**（SVG不可）
- 透過背景推奨
- 角丸推奨（16px程度）

### SVG→PNG変換（ImageMagick）

```bash
brew install imagemagick
convert -background none icon.svg -resize 128x128 icon-128.png
convert -background none icon.svg -resize 48x48 icon-48.png
convert -background none icon.svg -resize 16x16 icon-16.png
```

---

## ストア画像要件

### スクリーンショット

| 項目 | 仕様 |
|------|------|
| サイズ | 1280x800 または 640x400 |
| 形式 | PNG または JPEG |
| 枚数 | 1〜5枚（必須） |

### プロモーション画像（任意）

| 種類 | サイズ |
|------|--------|
| 小タイル | 440x280 |
| マーキー | 1400x560 |

---

## ビルドとパッケージング

### ビルドコマンド

```bash
npm run build
```

### ZIP作成

```bash
cd dist
zip -r ../extension.zip . -x "*.DS_Store" -x "__MACOSX/*" -x "*.map"
```

### 除外すべきファイル

- `node_modules/`
- `.git/`
- `store/` (ストアアセット)
- `*.map` (ソースマップ)
- テストファイル
- 開発用設定ファイル

---

## 審査でよくある指摘

### 1. 権限の過剰要求

```json
// NG: 使わない権限
"permissions": ["tabs", "history", "bookmarks", "storage"]

// OK: 必要最小限
"permissions": ["storage"]
```

### 2. アイコン形式

```json
// NG: SVG
"icons": { "128": "icon.svg" }

// OK: PNG
"icons": { "128": "icon-128.png" }
```

### 3. Manifest V2使用

```json
// NG
"manifest_version": 2

// OK
"manifest_version": 3
```

### 4. 説明と機能の不一致

- 説明文に書いた機能が未実装
- 実装機能が説明文にない

### 5. プライバシーポリシー

- URLが無効
- 内容不十分
- 拡張機能名と不一致

---

## バージョニング

```
MAJOR.MINOR.PATCH

1.0.0 → 1.0.1  # バグ修正
1.0.1 → 1.1.0  # 新機能追加
1.1.0 → 2.0.0  # 破壊的変更
```

---

## 参考リンク

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Publishing in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/)

---

## 参考: 既存プロジェクトの活用

プロジェクト内に既存のChrome拡張機能がある場合は、以下の点を参考にしてください：

| 参考ポイント | 確認箇所 |
|--------------|----------|
| ディレクトリ構成 | 既存拡張機能のフォルダ構造 |
| ストアアセット | `store/` 配下のファイル構成 |
| 多言語対応 | `_locales/` の構成 |
| ビルド設定 | `vite.config.ts`, `package.json` |

> **Tip**: 同じプロジェクト内の既存拡張機能を `ls` や `find` で探して参考にしましょう。
