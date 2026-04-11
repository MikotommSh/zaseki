# zaseki — 座席決めアプリ

## 概要
飲み会・席替えなど汎用の座席決めWebアプリ。フロントエンドのみ、GitHub Pagesでホスト。

## 技術スタック
- React 18 + TypeScript + Vite
- CSS Modules（UIライブラリなし）
- nanoid（ID生成）、html2canvas（PNG出力）
- gh-pages（デプロイ）

## コマンド
```bash
npm run dev      # 開発サーバー起動 (http://localhost:5173)
npm run build    # ビルド（tsc && vite build）
npm run preview  # ビルド結果をプレビュー
npm run deploy   # GitHub Pages へデプロイ
```

## プロジェクト構成
```
src/
├── types.ts               # Seat / Attendee / AppState 型定義
├── main.tsx
├── App.tsx                # 2カラムレイアウト（SidePanel + Canvas）
├── store/
│   ├── reducer.ts         # 全状態変更ロジック（useReducer）
│   └── useAppState.ts     # Reducer ラッパー、dispatch 関数を公開
├── components/
│   ├── SidePanel/         # 出席者管理 + アクションボタン
│   └── Canvas/            # 自由配置キャンバス + 座席ノード
├── hooks/
│   ├── useDrag.ts         # Pointer Events ドラッグ（外部ライブラリなし）
│   └── useUrlState.ts     # URLハッシュ ↔ 状態の同期
└── utils/
    ├── shuffle.ts         # Fisher-Yates（ピン固定対応）
    ├── urlCodec.ts        # base64url エンコード/デコード
    └── exportImage.ts     # html2canvas → PNG ダウンロード
```

## データモデル
```typescript
interface Seat { id, x, y, label?, assignedAttendeeId?, pinned }
interface Attendee { id, name }
interface AppState { seats: Seat[], attendees: Attendee[] }
```

## 主要な設計判断
- ページリロードで状態リセット（localStorage 不使用）
- ピン留めは座席側に持つ（pinned: true の座席はシャッフル対象外）
- URLシェア: AppState を base64url エンコードして # フラグメントに格納
- ドラッグ: 4px 閾値でクリックとドラッグを区別
- GitHub Pages の base パス: `/zaseki/`

## コンパクト指示
/compact 時は、コード変更内容・型定義・コンポーネント構造に集中して要約すること。
