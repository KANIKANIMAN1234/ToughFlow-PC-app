# ToughFlow PC

戸塚重量向け **ToughFlow** の事務・管理者向け PC Web アプリ（Next.js App Router）。

PC 向け画面（SC-022, SC-031, SC-050, SC-060, SC-070, SC-080）に対応。

## 技術スタック

- Next.js 15（App Router）
- React 19 / TypeScript
- Tailwind CSS（PC レイアウト：Sidebar 240px、折りたたみ可）
- Supabase PostgreSQL（`repository` 層経由）
- LINE Login（本番 OAuth）
- SWR キャッシュ

## 画面一覧

| パス | 画面 | 仕様 |
|------|------|------|
| `/login` | ログイン | SC-001（LINE Login / 開発用デモ） |
| `/home` | ホーム | SC-010（事務ダッシュボード・リマインド） |
| `/expenses` | 立替承認一覧 | SC-022 |
| `/daily-reports` | 作業日報一覧 | SC-031 |
| `/daily-reports/[id]` | 作業日報詳細 | SC-031 + PDF プレビュー枠 |
| `/projects` | 案件一覧 | SC-050 |
| `/dispatch` | 配車予定一覧 | SC-070 |
| `/dispatch/[id]` | 配車表編集 | SC-071 |
| `/vendor-payments` | 支払いリスト | SC-080 |
| `/settings` | 管理者設定 | SC-060（マスタ・権限・フォルダ設計） |

## 認証

| 方式 | 条件 |
|------|------|
| LINE Login | `LINE_CHANNEL_ID` 等の環境変数設定時（本番） |
| デモログイン | LINE 未設定時（会社コード + 名前 + ロール） |

初回 LINE ログイン時は `m_user` が自動作成され、役職は SC-060 で管理者が設定します。

## 権限

- ロール別・ユーザー別の権限矩阵は SC-060「権限管理」で編集可能
- API は `getUserAccessMap()` により個人上書き > ロール矩阵 > デフォルトの順で判定
- サイドバー表示も同一の権限矩阵から導出

## セットアップ

```bash
git clone https://github.com/KANIKANIMAN1234/ToughFlow-PC-app.git
cd ToughFlow-PC-app
cp .env.example .env.local
# .env.local に Supabase / LINE の値を設定
pnpm install
pnpm dev
```

http://localhost:3001

## 環境変数

| 変数 | 必須 | 説明 |
|------|:----:|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon キー |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | サーバー側 DB アクセス |
| `LINE_CHANNEL_ID` | 本番 | LINE Login チャネル ID |
| `LINE_CHANNEL_SECRET` | 本番 | LINE Login シークレット |
| `LINE_CALLBACK_URL` | 本番 | `/api/auth/callback/line` の完全 URL |

## mobile との関係

| 項目 | mobile | pc |
|------|--------|-----|
| ポート | 3000 | 3001 |
| 主利用者 | 現場（field） | 事務・管理者 |
| 主要画面 | SC-020/030/040 入力 | SC-022/031/060/080 一覧・承認 |
| データ | Supabase 共通 DB | Supabase 共通 DB |

## 開発コマンド

```bash
pnpm dev        # 開発サーバー（:3001）
pnpm build      # 本番ビルド
pnpm typecheck  # 型チェック
```
