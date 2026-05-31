# ToughFlow PC

戸塚重量向け **ToughFlow** の事務・管理者向け PC Web アプリ（Next.js App Router）。

仕様書 `02_app/Doc/` の PC 向け画面（SC-022, SC-031, SC-050, SC-060, SC-070, SC-080）に対応。

## 技術スタック

- Next.js 15（App Router）
- React 19 / TypeScript
- Tailwind CSS（PC レイアウト：Sidebar 240px 常時表示）
- デモ API（サーバー側インメモリ + デモ seed データ）

## 画面一覧

| パス | 画面 | 仕様 |
|------|------|------|
| `/login` | ログイン | SC-001（デモ: 会社コード + ロール選択） |
| `/home` | ホーム | SC-010（事務ダッシュボード） |
| `/expenses` | 立替承認一覧 | SC-022 |
| `/daily-reports` | 作業日報一覧 | SC-031 |
| `/daily-reports/[id]` | 作業日報詳細 | SC-031 + PDF プレビュー枠 |
| `/projects` | 案件一覧 | SC-050 |
| `/dispatch` | 配車予定一覧 | SC-070 |
| `/dispatch/[id]` | 配車表編集 | SC-071 |
| `/vendor-payments` | 支払いリスト | SC-080 |
| `/settings` | 管理者設定 | SC-060（マスタ管理 CRUD） |

## デモログイン

| 項目 | 値 |
|------|-----|
| 会社コード | `TOTSUKA` |
| ロール | `office`（事務）/ `admin`（管理者）/ `manager`（部長） |

管理者（admin）のみ「設定」メニューが表示されます。

## セットアップ

```bash
cd 02_app/pc
cp .env.example .env.local
pnpm install
pnpm dev
```

http://localhost:3001 （モバイル版 3000 と並行起動可）

## mobile との関係

| 項目 | mobile (`02_app/mobile`) | pc (`02_app/pc`) |
|------|--------------------------|------------------|
| ポート | 3000 | 3001 |
| 主利用者 | 現場（field） | 事務・管理者 |
| 主要画面 | SC-020/030/040 入力 | SC-022/031/060/080 一覧・承認 |
| データ | localStorage デモ | サーバーインメモリ + seed |

本番では Supabase 共通 DB で連携します。

## 開発コマンド

```bash
pnpm dev        # 開発サーバー（:3001）
pnpm build      # 本番ビルド
pnpm typecheck  # 型チェック
```
