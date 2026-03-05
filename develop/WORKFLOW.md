# Chrome拡張機能開発ワークフロー

ユーザーからChrome拡張機能の開発依頼を受けた際の手順です。

---

## Phase 1: 要件収集

ユーザーに以下を確認してください：

### 必須確認事項

1. **拡張機能のコンセプト**
   - 何を解決したいか？
   - 主要なターゲットユーザーは？

2. **基本機能要件**
   - 必須機能（MVP）
   - あれば嬉しい機能

3. **技術的制約**
   - 特定のWebサイト限定か、全サイト対応か
   - 必要な権限（tabs, storage, etc.）

### 質問テンプレート

```
拡張機能について教えてください：
1. どんな問題を解決したいですか？
2. 主なターゲットユーザーは？
3. 類似の拡張機能を知っていますか？
4. 技術的な制約はありますか？
```

---

## Phase 2: 競合調査

### 調査方法

1. **Chrome Web Store検索**
   - キーワードで検索
   - カテゴリ別検索
   - 評価順でソート

2. **調査項目**
   - 既存の類似拡張機能
   - それぞれのレビュー数・評価
   - 主な機能と差別化ポイント
   - ユーザーの不満点（レビューから）

3. **競合分析レポート作成**

```markdown
## 競合分析レポート

### 競合1: [拡張機能名]
- **URL**: [Chrome Web Store URL]
- **ユーザー数**: XX,XXX
- **評価**: X.X / 5.0 (XXX件)
- **主な機能**:
  - 機能1
  - 機能2
- **強み**:
- **弱み（レビューから）**:

### 差別化ポイント
[競合と比較した際の差別化ポイント]
```

---

## Phase 3: 技術設計

### ディレクトリ構造

プロジェクトの構造に合わせて拡張機能を作成：

```
[project-root]/
├── [extension-name]/
│   ├── manifest.json (または manifest.ts)
│   ├── package.json
│   ├── vite.config.ts (ビルドツールに応じて変更)
│   ├── tsconfig.json
│   ├── src/
│   │   ├── popup/          # ポップアップUI
│   │   ├── background/     # Service Worker
│   │   └── content/        # Content Script（必要な場合）
│   ├── public/
│   │   ├── icon-16.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   ├── _locales/           # 多言語対応する場合
│   │   ├── [default-locale]/messages.json
│   │   └── [other-locale]/messages.json
│   └── store/              # ストア申請用アセット
│       ├── PRIVACY_POLICY.md
│       ├── store-listing-[locale].md
│       └── [screenshots]
```

> **Note**: ディレクトリ構造はプロジェクトの要件に応じてカスタマイズしてください。

### manifest.json 必須設定

```json
{
  "manifest_version": 3,
  "name": "__MSG_extensionName__",
  "description": "__MSG_extensionDescription__",
  "version": "1.0.0",
  "default_locale": "ja",
  "icons": {
    "16": "icon-16.png",
    "48": "icon-48.png",
    "128": "icon-128.png"
  }
}
```

---

## Phase 4: 開発

### 開発手順

1. **プロジェクト初期化**
   ```bash
   mkdir [extension-name]
   cd [extension-name]
   npm init -y
   ```

2. **依存関係インストール**
   ```bash
   npm install -D typescript vite
   ```

3. **コア機能実装**
   - Popup UI
   - Background Service Worker
   - Content Script（必要な場合）

4. **多言語対応**（必要な場合）
   - `_locales/[locale]/messages.json` を各言語ごとに作成
   - `manifest.json` で `default_locale` を設定

5. **テスト**
   - `chrome://extensions/` でロード
   - 各機能の動作確認

---

## Phase 5: ストア申請準備

### 5-1: アイコン画像

| サイズ | 用途 |
|--------|------|
| 16x16 | ツールバー |
| 48x48 | 管理画面 |
| 128x128 | ストア表示 |

**形式**: PNG必須（SVG不可）

アイコン生成プロンプトを作成してユーザーに提案：

```
[拡張機能名]のChrome拡張機能アイコンを作成してください。
- サイズ: 128x128px
- 形式: PNG
- スタイル: [モダン/ミニマル/フラット]
- 色: [主要な色]
- 要素: [含めたいシンボル/アイコン]
```

### 5-2: スクリーンショット

- **サイズ**: 1280x800px
- **枚数**: 1〜5枚
- **内容**:
  1. メイン機能の画面
  2. 設定画面
  3. 特徴的な機能

### 5-3: プロモーション画像（任意）

| 種類 | サイズ |
|------|--------|
| 小タイル | 440x280 |
| マーキー | 1400x560 |

### 5-4: 説明文作成

**短い説明（132文字以内）**
- 主な機能を簡潔に
- 特徴を3つ程度

**詳細な説明**
- [TEMPLATES.md](./TEMPLATES.md) 参照

### 5-5: プライバシーポリシー

- [TEMPLATES.md](./TEMPLATES.md) のテンプレート使用
- 使用する権限の説明を含める
- GitHub Pagesなどで公開

---

## Phase 6: 申請

### ユーザーへの確認事項

```
ストア申請の準備ができました。以下を確認してください：

1. [ ] アイコン画像（16, 48, 128px）は用意しましたか？
2. [ ] スクリーンショット（1280x800）は用意しましたか？
3. [ ] プライバシーポリシーのURLはありますか？
4. [ ] Chrome Web Store Developer アカウントはありますか？
```

### 申請用ZIPビルド

```bash
npm run build
cd dist
zip -r ../extension.zip . -x "*.DS_Store" -x "__MACOSX/*"
```

---

## チェックリスト

### 申請前確認

- [ ] manifest.json が Manifest V3
- [ ] アイコンがPNG形式（16, 48, 128px）
- [ ] 権限が必要最小限
- [ ] プライバシーポリシーURL有効
- [ ] スクリーンショット1枚以上
- [ ] 短い説明が132文字以内
- [ ] 多言語対応（必要な場合）
- [ ] ビルド正常完了
- [ ] ZIPに不要ファイルなし
