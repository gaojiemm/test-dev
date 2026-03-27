---
name: github-changelog-skill
description: 直近 1 週間の GitHub Actions / Copilot 更新を取得し、日本語の業務レポート Markdown を生成する。
---

# GitHub Changelog Skill

## 概要
GitHub Changelog RSS から Action・Copilot カテゴリの記事を取得し、日本語の週次レポートを `work/log/` へ出力する。

## 入力
| パラメータ | 値 | 説明 |
|---|---|---|
| mode | `last-week`（既定） | 直近 7 日間の記事を対象にする |

## 出力
- ファイル: `work/log/github_changelog_YYYYMMDD~YYYYMMDD.md`
- 形式: フラット Markdown（`#` 見出しなし）
- 言語: 日本語のみ
- セクション: `説明` → `対象期間` → `Action:` → `Copilot:`

## 実行方法
詳細は [README.md](../../README.md) を参照。

```bash
npm install
npm run github-changelog
```