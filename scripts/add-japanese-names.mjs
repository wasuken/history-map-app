#!/usr/bin/env node

/**
 * GeoJSONファイルに日本語国名を追加するスクリプト (Gemini Flash版)
 * 
 * 使い方:
 *   node scripts/add-japanese-names.mjs
 * 
 * 必要な環境変数:
 *   GEMINI_API_KEY: Google Gemini APIキー
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// データソース定義
const DATA_SOURCES = {
  modern: {
    url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
    output: '../public/data/modern/countries.geojson'
  },
  historical: [
    { year: -2000, filename: 'world_bc2000.geojson' },
    { year: -500, filename: 'world_bc500.geojson' },
    { year: -323, filename: 'world_bc323.geojson' },
    { year: -200, filename: 'world_bc200.geojson' },
    { year: -1, filename: 'world_bc1.geojson' },
    { year: 400, filename: 'world_400.geojson' },
    { year: 600, filename: 'world_600.geojson' },
    { year: 800, filename: 'world_800.geojson' },
    { year: 1000, filename: 'world_1000.geojson' },
    { year: 1279, filename: 'world_1279.geojson' },
    { year: 1492, filename: 'world_1492.geojson' },
    { year: 1530, filename: 'world_1530.geojson' },
    { year: 1650, filename: 'world_1650.geojson' },
    { year: 1715, filename: 'world_1715.geojson' },
    { year: 1783, filename: 'world_1783.geojson' },
    { year: 1880, filename: 'world_1880.geojson' },
    { year: 1914, filename: 'world_1914.geojson' },
    { year: 1920, filename: 'world_1920.geojson' },
  ]
};

const HISTORICAL_BASE_URL = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson';

/**
 * Gemini Flash APIを使って国名を日本語に翻訳
 */
async function translateToJapanese(countryNames) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY環境変数が設定されていません');
  }

  const prompt = `以下の国名・地域名を日本語に翻訳してください。
歴史的な国家名も含まれているため、適切な日本語表記を選んでください。

出力形式: JSONオブジェクト { "英語名": "日本語名", ... }
注意: 
- 翻訳できない場合は空文字列""を返す
- 歴史的な国名も考慮する(例: "Roman Empire" -> "ローマ帝国")
- JSONのみを出力し、説明文は不要
- マークダウンのコードブロック記号は出力しない

国名リスト:
${JSON.stringify(countryNames, null, 2)}`;

  console.log(`  🤖 ${countryNames.length}件の国名をGemini Flash APIで翻訳中...`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Gemini APIからのレスポンスが不正です');
  }

  const content = data.candidates[0].content.parts[0].text;

  // JSONを抽出(マークダウンのコードブロックで囲まれている場合に対応)
  let jsonText = content.trim();

  // マークダウンのコードブロックを除去
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  // JSON部分のみを抽出
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('APIレスポンス:', content);
    throw new Error('Gemini APIからのレスポンスがJSON形式ではありません');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * GeoJSONファイルに日本語名を追加
 */
async function addJapaneseNames(geojson, translationCache = {}) {
  const features = geojson.features;

  // 翻訳が必要な国名を収集
  const untranslatedNames = [];
  for (const feature of features) {
    const name = feature.properties.NAME;
    if (name && !translationCache[name]) {
      untranslatedNames.push(name);
    }
  }

  // 新しい翻訳が必要な場合のみAPI呼び出し
  if (untranslatedNames.length > 0) {
    // 重複を除去
    const uniqueNames = [...new Set(untranslatedNames)];

    // Gemini Flash は大量のトークンを処理できるので、バッチサイズを100に設定
    const batchSize = 100;
    for (let i = 0; i < uniqueNames.length; i += batchSize) {
      const batch = uniqueNames.slice(i, i + batchSize);
      console.log(`  📦 バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueNames.length / batchSize)} (${batch.length}件)`);

      try {
        const translations = await translateToJapanese(batch);
        Object.assign(translationCache, translations);

        // レート制限対策: 少し待機 (Gemini Flashは寛容だが念のため)
        if (i + batchSize < uniqueNames.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`  ❌ バッチ翻訳エラー:`, error.message);
        // エラーが発生しても続行
      }
    }
  }

  // 翻訳を適用
  let appliedCount = 0;
  for (const feature of features) {
    const name = feature.properties.NAME;
    if (name && translationCache[name]) {
      feature.properties.NAME_JA = translationCache[name];
      appliedCount++;
    }
  }

  console.log(`  ✅ ${appliedCount}/${features.length}件に日本語名を適用`);

  return geojson;
}

/**
 * URLからGeoJSONを取得
 */
async function fetchGeoJSON(url) {
  console.log(`  📥 ダウンロード中: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return await response.json();
}

/**
 * ファイルを保存
 */
async function saveGeoJSON(filePath, geojson) {
  const fullPath = path.resolve(__dirname, filePath);
  const dir = path.dirname(fullPath);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, JSON.stringify(geojson, null, 2), 'utf-8');

  const fileSize = (JSON.stringify(geojson).length / 1024).toFixed(2);
  console.log(`  💾 保存完了: ${path.basename(fullPath)} (${fileSize} KB)`);
}

/**
 * 翻訳キャッシュを読み込み/保存
 */
async function loadTranslationCache() {
  const cachePath = path.resolve(__dirname, '../public/data/translation-cache.json');
  try {
    const data = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveTranslationCache(cache) {
  const cachePath = path.resolve(__dirname, '../public/data/translation-cache.json');
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * メイン処理
 */
async function main() {
  console.log('🌍 GeoJSONファイルに日本語名を追加します (Gemini Flash)\n');

  // 翻訳キャッシュを読み込み
  let translationCache = await loadTranslationCache();
  console.log(`📦 翻訳キャッシュ: ${Object.keys(translationCache).length}件\n`);

  try {
    // 現代国境データを処理
    console.log('📍 現代国境データを処理中...');
    const modernGeoJSON = await fetchGeoJSON(DATA_SOURCES.modern.url);
    const modernWithJa = await addJapaneseNames(modernGeoJSON, translationCache);
    await saveGeoJSON(DATA_SOURCES.modern.output, modernWithJa);
    console.log('');

    // 歴史的国境データを処理
    console.log('📜 歴史的国境データを処理中...');
    for (const yearData of DATA_SOURCES.historical) {
      const url = `${HISTORICAL_BASE_URL}/${yearData.filename}`;
      console.log(`\n⏳ ${yearData.filename} を処理中...`);

      try {
        const geojson = await fetchGeoJSON(url);
        const withJa = await addJapaneseNames(geojson, translationCache);
        await saveGeoJSON(`../public/data/historical/${yearData.filename}`, withJa);
      } catch (error) {
        console.error(`  ❌ エラー: ${error.message}`);
      }
    }

    // 翻訳キャッシュを保存
    await saveTranslationCache(translationCache);
    console.log(`\n✨ 完了! 翻訳キャッシュ: ${Object.keys(translationCache).length}件`);

  } catch (error) {
    console.error('❌ 致命的エラー:', error);
    // エラーが発生してもキャッシュは保存
    await saveTranslationCache(translationCache);
    throw error;
  }
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
