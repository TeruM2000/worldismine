# 公開手順（Cloudflare Pages ＋ teltel.dev）

公開先: **https://teltel.dev/worldismine/**

GitHub に push すると、Cloudflare が自動でビルドして公開する。リポジトリは非公開のままでよい。

```
GitHub に push → Cloudflare Pages がビルド（npm run build）→ teltel.dev/worldismine/ で公開
```

## 1. Cloudflare のアカウントを作る
https://dash.cloudflare.com/sign-up で無料アカウントを作る。

## 2. teltel.dev を取得する
1. ダッシュボードの左メニュー **Domain Registration → Register Domains** を開く
2. `teltel.dev` を検索し、空いていれば購入する（`.dev` は年1,800〜2,000円程度）
   - すでに他人が取得していた場合は、別の名前を考える必要がある
3. 購入すると、DNS の管理も自動で Cloudflare になる

## 3. Pages のプロジェクトを作る
1. 左メニュー **Workers & Pages → Create** を開き、**Pages** を選ぶ
2. **Import an existing Git repository** を選び、GitHub と連携する
   - 連携時に、アクセスを許可するリポジトリとして `worldismine` を選ぶ
3. ビルドの設定を次のようにする

| 項目 | 値 |
|---|---|
| Project name | `worldismine` |
| Production branch | 本番として公開するブランチ（下の「ブランチについて」を参照） |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |

4. **Save and Deploy** を押す。1〜2分で `https://worldismine.pages.dev/worldismine/` に公開される

Node.js のバージョンは、リポジトリの `.node-version`（22）が自動で使われる。

## 4. teltel.dev を割り当てる
1. 作ったプロジェクトの **Custom domains** タブを開く
2. **Set up a custom domain** で `teltel.dev` を入力する
3. teltel.dev が同じアカウントにあるので、DNS の設定は自動で追加される
4. 数分で `https://teltel.dev/worldismine/` が開けるようになる（HTTPS の証明書も自動で発行される）

## ブランチについて
- **Production branch** に push すると本番（teltel.dev/worldismine/）が更新される
- それ以外のブランチに push すると、ブランチごとのプレビュー用 URL（`https://<ブランチ名>.worldismine.pages.dev/worldismine/`）が作られる。本番に出す前にスマホで試せる

## パスの仕組み
- ビルドすると、アプリは `dist/worldismine/` に出力される。Cloudflare には `dist` を公開させるので、アプリは `teltel.dev/worldismine/` になる
- `dist/_redirects` で、`teltel.dev/` に来た人を `/worldismine/` に転送している（`vite.config.ts` で生成）
- 将来ほかのアプリを `teltel.dev/xxx/` に並べるときは、`teltel.dev` 直下の割り当てを外し、Cloudflare Workers でパスごとに各アプリへ振り分ける形に移行する

## 補足
- `.dev` ドメインは HTTPS でしか開けない決まりになっているが、Cloudflare が証明書を自動で発行するので作業は不要
- GitHub Actions（`.github/workflows/ci.yml`）は、ビルドが通るかの確認だけを行う。公開は Cloudflare が行う
