# World is Mine

スマホのブラウザで遊べる国位置クイズ。地図でハイライトされた国を8択から当てて、世界197か国を塗りつぶしていく。

- ヒントなしで正解 → 金、ヒントを使って正解 → 赤
- 赤の国もヒントなしで正解すれば金になる。全197か国を金にするのがゴール

要件は [docs/requirements.md](docs/requirements.md) を参照。

## 開発

```sh
npm install
npm run dev      # 開発サーバー
npm run build    # 型チェックとビルド（dist/ に出力）
```

地図データ（`public/world.json`）は Natural Earth 1:50m から作っている。作り直すときは `npm run build:map`。

## 公開

デフォルトブランチに push すると GitHub Actions がビルドし、GitHub Pages に公開する。
初回だけ、リポジトリの Settings → Pages → Build and deployment の Source を「GitHub Actions」にする。

## 使っているデータ

- 地図: [Natural Earth](https://www.naturalearthdata.com/)（パブリックドメイン）
- 国旗: [flag-icons](https://github.com/lipis/flag-icons)（MIT License）
