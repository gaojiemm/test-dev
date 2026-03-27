# GitHub Changelog Skill Demo

GitHub Changelog RSS から **Action** と **Copilot** カテゴリの更新を取得し、日本語の週次レポート Markdown を生成するスクリプト。

---

## 前提条件

| 項目 | 要件 |
|---|---|
| Node.js | v18 以上（`fetch` が使えること） |
| npm | Node.js に同梱のもので可 |
| インターネット接続 | `https://github.blog/changelog/feed/` へアクセスできること |

## ディレクトリ構成

```
JST-workflow/
├── .github/
│   ├── skills/
│   │   └── skill.md          # Copilot Skill 定義
│   └── workflows/
│       └── verify-jst-schedule.yml
├── scripts/
│   └── github-changelog.mjs  # メインスクリプト
├── work/
│   └── log/                   # レポート出力先
├── package.json
└── README.md                  # ← このファイル
```

## 実行手順

### 1. 依存パッケージのインストール

```bash
npm install
```

初回のみ。`cheerio`・`dayjs`・`fast-xml-parser` がインストールされる。

### 2. レポート生成

```bash
npm run github-changelog
```

- 直近 7 日間の GitHub Changelog を取得
- Action / Copilot のみ抽出
- `work/log/github_changelog_YYYYMMDD~YYYYMMDD.md` へ保存
- コンソールにも内容を出力

### 3. 出力例（抜粋）

```
説明
この週は Action で 2 件、Copilot で 5 件の更新があり…

対象期間：2026/03/21～2026/03/27

Action:

- タイトル：…
- 内容
	- 概要
		- …
- 情報元：🔗 https://…

Copilot:

- タイトル：…
- 内容
	- 変更点
		- …
	- 変更がない点
		- …
- 情報元：🔗 https://…
```

## 出力フォーマット仕様

| 項目 | ルール |
|---|---|
| 見出し | `#` / `##` を使わない（フラット Markdown） |
| 言語 | 日本語のみ。英語の記事タイトルをそのまま見出しにしない |
| セクション | `説明` → `対象期間` → `Action:` → `Copilot:` |
| 記事単位 | 1 記事 = 1 ブロック（`- タイトル：` で始まる） |
| Action 内容 | `概要` のネスト箇条書き |
| Copilot 内容 | `変更点` / `変更がない点` のネスト箇条書き |
| 該当なし | カテゴリに記事がない場合は `該当なし` と記載 |

## カスタマイズ

- 対象カテゴリを変えたい場合: `scripts/github-changelog.mjs` 内の `CATEGORY_ORDER` を編集
- 出力先を変えたい場合: 同ファイル内の `OUTPUT_DIR` を変更
