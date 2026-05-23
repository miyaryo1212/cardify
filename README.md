# cardify

任意のページの OGP メタタグを転送する自前ホスティング ラッパー。Chatwork など、リンク先のカード表示が弱いサービス向け。

## 構成

- Cloudflare Workers（`cardify.miyaryo1212.com`）
- KV: OGP キャッシュ（key = `sha256(url)`）
- R2: og:image のミラー（ホットリンク回避）
- HMAC 署名: 登録のみ自分専用、閲覧はパブリック

## エンドポイント

```
POST /register?url=<target>&sig=<HMAC>      登録（要署名、所有者のみ）
GET  /?url=<target>                          閲覧（誰でも可、未登録なら素通し）
GET  /placeholder.svg?title=&host=           og:image が無いページ用のダミー画像
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
| `og:image` | `/placeholder.svg` でタイトル+ホスト名を焼き込んだ SVG を自動生成 |

## デプロイ

### 0. 前提

- Cloudflare アカウント（Workers 無料枠で OK）
- `miyaryo1212.com` の DNS が Cloudflare 配下にある（カスタムドメイン割当に必要）
- Node.js 20+

### 1. 依存インストール & ログイン

```bash
npm install
npx wrangler login
```

### 2. KV 名前空間を作成して wrangler.toml に反映

```bash
npx wrangler kv namespace create OGP_CACHE
```

出力された `id` を `wrangler.toml` の `kv_namespaces.id` に貼り付ける:

```toml
[[kv_namespaces]]
binding = "OGP_CACHE"
id = "ここに貼る"
```

### 3. R2 バケットを作成

```bash
npx wrangler r2 bucket create cardify-ogp-images
```

### 4. HMAC 用シークレットを登録

ランダム文字列を生成して登録（プロンプトで貼り付け）:

```bash
openssl rand -hex 32 | pbcopy   # macOS。Linux なら `xclip -selection clipboard`
npx wrangler secret put HMAC_SECRET
```

このシークレットはローカル（mint-url 用）にも保持しておく。

### 5. デプロイ

```bash
npx wrangler deploy
```

### 6. Cloudflare ダッシュボードで仕上げ

#### a) Worker のカスタムドメイン

`Workers & Pages` → `cardify` → `Settings` → `Domains & Routes` →
`Add` → `Custom Domain` で `cardify.miyaryo1212.com` を追加。
（DNS レコードと SSL 証明書は自動で作られる）

#### b) R2 のカスタムドメイン

`R2` → `cardify-ogp-images` → `Settings` → `Public access` →
`Connect Domain` で `images.cardify.miyaryo1212.com` を割当。
（`PUBLIC_IMAGE_BASE` と一致させること。違う名前にしたなら `wrangler.toml` を書き換えて再デプロイ）

### 7. 動作確認

```bash
HMAC_SECRET=xxx npm run mint -- 'https://example.com/'
# 出力された curl を実行 → JSON で wrapper URL が返れば成功
# その wrapper URL を curl して <meta og:*> 入りの HTML が返ることを確認
```

## 使い方

```bash
HMAC_SECRET=xxx npm run mint -- 'https://example.com/article'
# → 登録用 curl コマンドと共有用 wrapper URL が表示される
```

Chatwork 等に貼るのは `https://cardify.miyaryo1212.com/?url=...` の方。

## 開発

```bash
npm run dev         # wrangler dev（ローカル）
npm run typecheck
npm run deploy
```

ローカルで HMAC を使いたい時は `.dev.vars` に書く:

```
HMAC_SECRET=xxx
```
