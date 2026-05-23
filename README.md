# cardify

任意のページの OGP メタタグを転送する自前ホスティング ラッパー。Chatwork など、リンク先のカード表示が弱いサービス向け。

## 構成

- Cloudflare Workers（`cardify.miyaryo1212.com`）
- KV: OGP キャッシュ（key = `sha256(url)`）
- R2: og:image のミラー（ホットリンク回避）
- HMAC 署名: 登録のみ自分専用、閲覧はパブリック

## エンドポイント

```
POST /register?url=<target>&sig=<HMAC>   登録（要署名）
GET  /?url=<target>                       閲覧（誰でも可、未登録なら素通し）
```

- 登録時に 1 回だけパース → KV に保存
- 以降は閲覧時にキャッシュ済み HTML を返却（更新は検知しない）
- 未登録 URL への閲覧は元 URL へ 302 リダイレクト

## フォールバック

OGP メタが無いページについても、以下から最低限の card を組み立てます。

| 項目 | フォールバック元 |
|---|---|
| `og:title` | `<title>` → ホスト名 |
| `og:description` | `<meta name="description">` |
| `og:url` | リクエストされた URL |
| `og:site_name` | ホスト名 |
| `og:type` | `"website"` |
| `og:image` | なし（偽の画像を出すより無のが良いので空のまま） |

## セットアップ

```bash
npm install
npx wrangler kv namespace create OGP_CACHE        # → wrangler.toml の id に貼る
npx wrangler r2 bucket create cardify-ogp-images
npx wrangler secret put HMAC_SECRET               # 任意の長いランダム文字列
```

Cloudflare ダッシュボードで以下を設定:

- Worker Route: `cardify.miyaryo1212.com/*` を本 Worker に紐付け
- R2 バケット `cardify-ogp-images` をパブリック公開し、`images.cardify.miyaryo1212.com` 等のカスタムドメインを当てる（`PUBLIC_IMAGE_BASE` と一致させる）

## 使い方

```bash
HMAC_SECRET=xxx npm run mint -- 'https://example.com/article'
# → 登録用 curl コマンドと共有用 wrapper URL が表示される
```

Chatwork 等に貼るのは `https://cardify.miyaryo1212.com/?url=...` の方。

## 開発

```bash
npm run dev         # wrangler dev
npm run typecheck
npm run deploy
```
