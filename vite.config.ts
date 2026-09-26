import { defineConfig } from 'vite';

export default defineConfig({
  // 相対パスで出力し、GitHub Pages のサブパス（/worldismine/）でもそのまま動くようにする
  base: './',
  build: {
    // 国旗は表示するときだけ読み込めばよいので、JS に埋め込まない
    assetsInlineLimit: (file) => (file.includes('flag-icons') ? false : undefined),
  },
});
