# 歴史地図ノート

React + TypeScript + Vite + MapLibre GL を使用した歴史的国境の可視化アプリケーション

## 🌍 特徴

- **現代・歴史的国境の表示**: 紀元前2000年から1920年までの歴史的国境データを表示
- **日本語検索対応**: すべての国名に日本語翻訳を追加
- **描画機能**: ポリゴン、矢印、注記を地図上に描画
- **ハイライト機能**: 複数の国や年代を色分けして比較

## 📦 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 地図データの準備

GeoJSONファイルに日本語翻訳を追加してローカルに保存します。

```bash
# Anthropic APIキーを設定
export ANTHROPIC_API_KEY="your-api-key-here"

# データ変換スクリプトを実行
npm run prepare-data
```

このスクリプトは以下を実行します:
- 現代国境データ(Natural Earth)をダウンロード
- 歴史的国境データ(aourednik/historical-basemaps)をダウンロード
- Claude APIで各国名を日本語に翻訳
- `public/data/`ディレクトリに保存

**注意**: 
- 初回実行時は18ファイル × 50-200国 = 約1,000-2,000件の翻訳が必要です
- API呼び出しにより数分かかる場合があります
- 翻訳結果は`public/data/translation-cache.json`にキャッシュされます

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開きます。

## 🗂️ ディレクトリ構成

```
.
├── public/
│   └── data/
│       ├── modern/
│       │   └── countries.geojson          # 現代国境(日本語付き)
│       ├── historical/
│       │   ├── world_bc2000.geojson       # 各年代(日本語付き)
│       │   ├── world_bc500.geojson
│       │   └── ...
│       └── translation-cache.json         # 翻訳キャッシュ
├── scripts/
│   └── add-japanese-names.mjs             # データ変換スクリプト
├── src/
│   ├── components/
│   │   ├── MapComponent.tsx               # 地図コンポーネント
│   │   ├── SearchBar.tsx                  # 検索バー
│   │   ├── Toolbar.tsx                    # ツールバー
│   │   └── Sidebar.tsx                    # サイドバー
│   ├── data/
│   │   └── historicalYears.ts             # 年代定義
│   └── types/
│       └── index.ts                       # 型定義
└── package.json
```

## 🔧 技術スタック

- **React 19**: UIフレームワーク
- **TypeScript**: 型安全性
- **Vite**: ビルドツール
- **MapLibre GL**: 地図ライブラリ
- **OpenStreetMap**: ベースマップ
- **Claude API**: 国名翻訳

## 📊 データソース

### 現代国境
- **Natural Earth**: https://www.naturalearthdata.com/
- 解像度: 1:110m (低解像度)

### 歴史的国境
- **aourednik/historical-basemaps**: https://github.com/aourednik/historical-basemaps
- 期間: 紀元前2000年 ~ 1920年
- 18の時点データ

## 🚀 ビルド

```bash
npm run build
```

`dist/`ディレクトリに本番用ビルドが生成されます。

## ⚠️ 注意事項

### データ変換について
- `npm run prepare-data`は初回のみ実行が必要です
- 既にファイルが存在する場合はスキップされます
- 翻訳キャッシュを削除したい場合は`public/data/translation-cache.json`を削除

### APIレート制限
- Claude API呼び出しは1秒に1回に制限されています
- 大量のデータ処理時は時間がかかる場合があります

## 📝 ライセンス

MIT

## 🙏 謝辞

- [Natural Earth](https://www.naturalearthdata.com/) - 現代国境データ
- [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps) - 歴史的国境データ
- [OpenStreetMap](https://www.openstreetmap.org/) - ベースマップタイル
