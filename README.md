# World is Mine

スマホのブラウザで遊べる国位置クイズ。地図でハイライトされた国を8択から当てて、世界197か国を塗りつぶしていく。

- ヒントなしで正解 → 金、ヒントを使って正解 → 赤
- 赤の国もヒントなしで正解すれば金になる。全197か国を金にするのがゴール

要件は [docs/requirements.md](docs/requirements.md) を参照。

## 開発

```sh
npm install
npm run dev      # 開発サーバー
npm run build    # 型チェックとビルド（dist/worldismine/ に出力）
```

地図データ（`public/world.json`）は Natural Earth 1:50m から作っている。作り直すときは `npm run build:map`。

## 公開

https://teltel.dev/worldismine/ で公開する（Cloudflare Pages）。
本番用のブランチに push すると Cloudflare が自動でビルドして更新する。設定手順は [docs/deploy.md](docs/deploy.md) を参照。

## 使っているデータ

- 地図: [Natural Earth](https://www.naturalearthdata.com/)（パブリックドメイン）
- 国旗: [flag-icons](https://github.com/lipis/flag-icons)（MIT License）
