# zaseki — 座席決めアプリ（iOS版）

## 概要
飲み会・席替えなど汎用の座席決めアプリ。React 18 + TypeScript 製の Web アプリを Capacitor でネイティブ iOS アプリとしてラップし、App Store 公開を目指すリポジトリ。

## 技術スタック
- React 18 + TypeScript + Vite
- CSS Modules（UIライブラリなし）
- Capacitor（iOS ネイティブラップ）
- nanoid（ID生成）、html2canvas（PNG出力）
- @capacitor/share（ネイティブ共有シート）

## コマンド
```bash
npm run dev          # 開発サーバー起動 (http://localhost:5173)
npm run build        # ビルド（tsc && vite build）
npm run preview      # ビルド結果をプレビュー
npm run ios:build    # Web ビルド + Capacitor 同期
npm run ios:open     # Xcode を開く
npx playwright test  # E2E テスト（desktop + mobile WebKit）
```

## プロジェクト構成
```
src/
├── types.ts               # Seat / Attendee / AppState / Landmark 型定義
├── main.tsx
├── App.tsx                # モバイル：タブバー、デスクトップ：2カラム
├── store/
│   ├── reducer.ts         # 全状態変更ロジック（useReducer）
│   └── useAppState.ts     # Reducer ラッパー、dispatch 関数を公開
├── components/
│   ├── SidePanel/         # 出席者管理 + アクションボタン
│   ├── Canvas/            # 自由配置キャンバス + 座席ノード + ランドマーク
│   └── Onboarding/        # 初回起動時チュートリアルスライド（5枚）
├── hooks/
│   ├── useDrag.ts         # Pointer Events ドラッグ（境界なし）
│   └── useUrlState.ts     # URLハッシュ ↔ 状態の同期
└── utils/
    ├── shuffle.ts         # Fisher-Yates（ピン固定対応）
    ├── urlCodec.ts        # base64url エンコード/デコード
    └── exportImage.ts     # Web Share API (files) / <a download> フォールバック
ios/                       # Capacitor が生成した Xcode プロジェクト
e2e/                       # Playwright E2E テスト（desktop + mobile）
capacitor.config.ts        # Capacitor 設定（appId, webDir など）
```

## データモデル
```typescript
interface Seat { id, x, y, label?, assignedAttendeeId?, pinned }
interface Attendee { id, name }
interface Landmark { id, x, y, label }
interface AppState { seats: Seat[], attendees: Attendee[], landmarks: Landmark[] }
```

## 主要な設計判断
- **Capacitor**: `base: './'`（vite.config.ts）で file:// プロトコル対応
- **セーフエリア**: body ではなく `.app` / `.tabBar` に `env(safe-area-inset-*)` を適用
- **レイアウト**: `height: 100dvh`（Dynamic Viewport Height）でモバイル対応
- **URL共有**: `https://mikotommsh.github.io/zaseki/#<encoded>` の固定 Web URL を生成し、ネイティブでは `@capacitor/share` で共有シートを表示
- **画像書き出し**: `navigator.canShare({files})` が使えれば Web Share API でネイティブ共有、それ以外は `<a download>` でダウンロード
- **ドラッグ**: 4px 閾値でクリックとドラッグを区別、境界なし（どこへでも移動可）
- **ピン留め**: 座席側に `pinned: true` を持つ（シャッフル対象外）
- **オンボーディング**: `localStorage('zaseki_onboarding_done')` で初回のみ表示
- **タッチ向け UI**: `@media (pointer: coarse)` でフッターテキストを切り替え

## コンパクト指示
/compact 時は、コード変更内容・型定義・コンポーネント構造に集中して要約すること。
