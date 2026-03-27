#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import * as cheerio from 'cheerio';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { XMLParser } from 'fast-xml-parser';

dayjs.extend(utc);

const CHANGELOG_FEED_URL = 'https://github.blog/changelog/feed/';
const OUTPUT_DIR = path.resolve('work/log');
const CATEGORY_ORDER = ['actions', 'copilot'];
const TYPE_LABELS = {
  Improvement: '改善',
  Release: '提供開始',
  Retired: '提供終了',
  Update: '更新'
};

function getRange(mode) {
  const end = dayjs().utc().endOf('day');

  if (mode === 'last-week' || !mode) {
    return {
      label: 'last-week',
      start: end.subtract(6, 'day').startOf('day'),
      end
    };
  }

  throw new Error(`Unsupported range mode: ${mode}`);
}

function normalizeArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function toPlainText(html) {
  const $ = cheerio.load(html || '');
  $('script, style').remove();

  const paragraphs = $('p')
    .map((_, element) => $(element).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(Boolean)
    .filter((text) => !text.startsWith('The post '));

  if (paragraphs.length > 0) {
    return paragraphs[0];
  }

  return $.text().replace(/\s+/g, ' ').trim();
}

function toParagraphs(html) {
  const $ = cheerio.load(html || '');
  $('script, style').remove();

  const paragraphs = $('p')
    .map((_, element) => $(element).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(Boolean)
    .filter((text) => !text.startsWith('The post '));

  if (paragraphs.length > 0) {
    return paragraphs;
  }

  const plainText = $.text().replace(/\s+/g, ' ').trim();
  return plainText ? [plainText] : [];
}

function parseCategories(item) {
  const categories = normalizeArray(item.category).map((category) => {
    if (typeof category === 'string') {
      return { domain: '', name: category };
    }

    return {
      domain: category.domain || '',
      name: category['#text'] || ''
    };
  });

  const type = categories.find((category) => category.domain === 'changelog-type')?.name || 'Update';
  const labels = categories
    .filter((category) => category.domain === 'changelog-label')
    .map((category) => category.name.toLowerCase());

  return { type, labels };
}

function toEntry(item) {
  const { type, labels } = parseCategories(item);
  const publishedAt = dayjs.utc(item.pubDate);
  const summarySource = item['content:encoded'] || item.description || '';
  const paragraphs = toParagraphs(summarySource);

  return {
    title: item.title.trim(),
    link: item.link.trim(),
    publishedAt,
    type,
    labels,
    paragraphs,
    summary: toPlainText(summarySource)
  };
}

function isTrackedCategory(entry, category) {
  return entry.labels.includes(category);
}

function formatDate(date) {
  return date.format('YYYY/MM/DD');
}

function normalizeSummaryText(text) {
  return text
    .replace(/GitHub-hosted runners/gi, 'GitHub ホストランナー')
    .replace(/GitHub Actions/gi, 'GitHub Actions')
    .replace(/GitHub Copilot/gi, 'GitHub Copilot')
    .replace(/pull requests/gi, 'プルリクエスト')
    .replace(/merge conflicts/gi, 'マージ競合')
    .replace(/run summary/gi, '実行サマリー')
    .replace(/custom images/gi, 'カスタムイメージ')
    .replace(/coding agent/gi, 'コーディングエージェント')
    .replace(/public preview/gi, 'パブリックプレビュー')
    .replace(/usage metrics/gi, '利用状況メトリクス')
    .replace(/enterprise/gi, 'Enterprise')
    .replace(/organization admins/gi, '組織管理者')
    .replace(/agentic workflow/gi, 'アジェンティックワークフロー')
    .replace(/markdown configs/gi, 'Markdown 設定')
    .replace(/Jira/gi, 'Jira');
}

function createJapaneseTitle(entry, category) {
  const title = entry.title;

  if (category === 'actions') {
    if (/View Agentic Workflow configs in the Actions run summary/i.test(title)) {
      return 'アジェンティックワークフロー設定を実行サマリーで確認可能';
    }

    if (/Custom images for GitHub-hosted runners are now generally available/i.test(title)) {
      return 'GitHub ホストランナーのカスタムイメージが一般提供';
    }

    return `GitHub Actions の${TYPE_LABELS[entry.type] || '更新'}`;
  }

  if (/Gemini 3 Pro deprecated/i.test(title)) {
    return 'Gemini 3 Pro の提供終了';
  }

  if (/resolve merge conflicts on pull requests/i.test(title)) {
    return 'Copilot によるプルリクエスト競合解消への対応';
  }

  if (/Copilot for Jira .* Public preview enhancements/i.test(title)) {
    return 'GitHub Copilot for Jira のパブリックプレビュー改善';
  }

  if (/Privacy Statement and Terms of Service/i.test(title)) {
    return 'GitHub Copilot 関連データ利用説明の更新';
  }

  if (/usage metrics now identify active Copilot coding agent users/i.test(title)) {
    return 'Copilot 利用状況メトリクスでコーディングエージェント利用者を識別可能';
  }

  return `GitHub Copilot の${TYPE_LABELS[entry.type] || '更新'}`;
}

function buildActionDetails(entry) {
  if (/View Agentic Workflow configs in the Actions run summary/i.test(entry.title)) {
    return [
      'GitHub Actions の実行サマリー上で、アジェンティックワークフローの Markdown 設定を確認できるようになりました。',
      '各実行でどの設定が使われたかを、結果画面から直接追跡できます。',
      '設定ファイルを別途開かずに、実行内容と設定内容を照合しやすくなります。',
      '実行確認と設定レビューを一つの画面で進めやすくなります。'
    ];
  }

  if (/Custom images for GitHub-hosted runners are now generally available/i.test(entry.title)) {
    return [
      'GitHub ホストランナー向けのカスタムイメージ機能が一般提供になりました。',
      '2025 年 10 月に公開されたパブリックプレビューから正式提供へ移行した内容です。',
      '必要なツールや依存関係を含む実行環境を、あらかじめ標準化しやすくなります。',
      'ランナー準備のばらつきを抑え、ワークフロー実行の再現性を高めやすくなります。'
    ];
  }

  return [
    `更新種別は ${TYPE_LABELS[entry.type] || '更新'} です。`,
    `公開日は ${formatDate(entry.publishedAt)} です。`,
    `対象は GitHub Actions 関連の記事です。`,
    '詳細は情報元を参照してください。'
  ];
}

function buildCopilotChanges(entry) {
  if (/Gemini 3 Pro deprecated/i.test(entry.title)) {
    return [
      'GitHub Copilot の各体験において Gemini 3 Pro が非推奨になりました。',
      '対象には Copilot Chat、インライン編集、Ask、Agent モード、コード補完が含まれます。',
      '該当モデルを利用している場合は、代替モデルの確認が必要です。'
    ];
  }

  if (/resolve merge conflicts on pull requests/i.test(entry.title)) {
    return [
      'Copilot コーディングエージェントが、プルリクエストのマージ競合を解消できるようになりました。',
      '@copilot への依頼として競合解消を実行できます。',
      '競合整理の手作業を減らし、レビュー前の調整を進めやすくなります。'
    ];
  }

  if (/Copilot for Jira .* Public preview enhancements/i.test(entry.title)) {
    return [
      'GitHub Copilot for Jira のパブリックプレビュー機能に改善が加えられました。',
      '公開後の利用者フィードバックを踏まえた見直しが反映されています。',
      'Jira 連携を利用する際の使い勝手向上が中心の更新です。'
    ];
  }

  if (/Privacy Statement and Terms of Service/i.test(entry.title)) {
    return [
      'プライバシーステートメントおよび利用規約における、データ利用説明の更新が案内されました。',
      'GitHub Copilot 関連のデータ利用の扱いを確認しやすくする内容です。',
      '契約や社内運用の確認時に参照が必要な変更です。'
    ];
  }

  if (/usage metrics now identify active Copilot coding agent users/i.test(entry.title)) {
    return [
      'Copilot 利用状況メトリクスで、Copilot コーディングエージェントの利用者を識別できるようになりました。',
      'Enterprise 管理者と組織管理者が、該当利用者を把握しやすくなります。',
      '運用状況の確認や利用実績の把握に使える情報が追加されました。'
    ];
  }

  return [
    `更新種別は ${TYPE_LABELS[entry.type] || '更新'} です。`,
    `公開日は ${formatDate(entry.publishedAt)} です。`,
    `${normalizeSummaryText(entry.summary) || 'GitHub Copilot 関連の更新が公開されました。'}`
  ];
}

function buildCopilotUnchanged(entry) {
  if (/Copilot for Jira .* Public preview enhancements/i.test(entry.title)) {
    return [
      '提供段階は引き続きパブリックプレビューです。',
      'Jira 連携の枠組み自体を別製品へ置き換える案内ではありません。'
    ];
  }

  return [
    'GitHub Copilot 自体の提供枠組みを全面的に置き換える案内ではありません。',
    '記事内では、ここに記載した変更点以外の追加変更は明示されていません。'
  ];
}

function buildDescription(groupedEntries) {
  const actionCount = groupedEntries.actions.length;
  const copilotCount = groupedEntries.copilot.length;

  if (actionCount === 0 && copilotCount === 0) {
    return 'この週は Action と Copilot に該当する更新はありませんでした。';
  }

  return `この週は Action で ${actionCount} 件、Copilot で ${copilotCount} 件の更新があり、実行確認、実行環境、Copilot 機能、利用条件に関する変更が公開されました。`;
}

function buildActionSection(lines, entries) {
  lines.push('Action:');
  lines.push('');

  if (entries.length === 0) {
    lines.push('該当なし');
    lines.push('');
    return;
  }

  for (const entry of entries) {
    const details = buildActionDetails(entry);
    lines.push(`- タイトル：${createJapaneseTitle(entry, 'actions')}`);
    lines.push('- 内容');
    lines.push('\t- 概要');

    for (const detail of details) {
      lines.push(`\t\t- ${detail}`);
    }

    lines.push(`- 情報元：🔗 ${entry.link}`);
    lines.push('');
  }
}

function buildCopilotSection(lines, entries) {
  lines.push('Copilot:');
  lines.push('');

  if (entries.length === 0) {
    lines.push('該当なし');
    lines.push('');
    return;
  }

  for (const entry of entries) {
    const changes = buildCopilotChanges(entry);
    const unchanged = buildCopilotUnchanged(entry);

    lines.push(`- タイトル：${createJapaneseTitle(entry, 'copilot')}`);
    lines.push('- 内容');
    lines.push('\t- 変更点');

    for (const change of changes) {
      lines.push(`\t\t- ${change}`);
    }

    lines.push('\t- 変更がない点');

    for (const item of unchanged) {
      lines.push(`\t\t- ${item}`);
    }

    lines.push(`- 情報元：🔗 ${entry.link}`);
    lines.push('');
  }
}

function buildMarkdown(range, groupedEntries) {
  const lines = [
    '説明',
    buildDescription(groupedEntries),
    '',
    `対象期間：${formatDate(range.start)}～${formatDate(range.end)}`,
    ''
  ];

  buildActionSection(lines, groupedEntries.actions);
  buildCopilotSection(lines, groupedEntries.copilot);

  return `${lines.join('\n').trim()}\n`;
}

async function fetchEntries() {
  const response = await fetch(CHANGELOG_FEED_URL, {
    headers: {
      'user-agent': 'github-changelog-skill-demo/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch changelog feed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '#text',
    trimValues: true,
    cdataPropName: false
  });

  const parsed = parser.parse(xml);
  const items = normalizeArray(parsed?.rss?.channel?.item);

  return items.map(toEntry);
}

async function main() {
  const mode = process.argv[2] || 'last-week';
  const range = getRange(mode);
  const entries = await fetchEntries();

  const filtered = entries
    .filter((entry) => !entry.publishedAt.isBefore(range.start) && !entry.publishedAt.isAfter(range.end))
    .filter((entry) => CATEGORY_ORDER.some((category) => isTrackedCategory(entry, category)))
    .sort((left, right) => right.publishedAt.valueOf() - left.publishedAt.valueOf());

  const groupedEntries = {
    actions: filtered.filter((entry) => isTrackedCategory(entry, 'actions')),
    copilot: filtered.filter((entry) => isTrackedCategory(entry, 'copilot'))
  };

  const markdown = buildMarkdown(range, groupedEntries);
  const outputFileName = `github_changelog_${range.start.format('YYYYMMDD')}~${range.end.format('YYYYMMDD')}.md`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(outputPath, markdown, 'utf8');

  process.stdout.write(markdown);
  process.stderr.write(`Saved to ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});