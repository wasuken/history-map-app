# プロジェクト仕様

## 国名の表示ロジック

プロジェクト全体で国名を表示する際は、以下の優先順位に従うこと：

1. `properties.NAME_JA` (日本語名) が存在する場合はそれを使用する。
2. 存在しない場合は `properties.NAME` (共通名/英語名) を使用する。

### 実装例 (TypeScript)

```typescript
const displayName = country.properties.NAME_JA || country.properties.NAME;
```

### 適用場所
- `App.tsx`: ハイライト済みリストのラベル
- `SearchBar.tsx`: 検索候補のメインテキスト
- `MapComponent.tsx`: 地図上のハイライトポリゴンをホバーした際のポップアップ
