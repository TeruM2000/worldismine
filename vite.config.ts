import { writeFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

/** 公開する URL のパス（teltel.dev/worldismine/） */
const APP_PATH = 'worldismine';

export default defineConfig({
  // 相対パスで出力し、どのパスに置いても動くようにする
  base: './',
  build: {
    // dist/ がドメインの直下になるので、アプリは dist/worldismine/ に出力する
    outDir: `dist/${APP_PATH}`,
    // 国旗は表示するときだけ読み込めばよいので、JS に埋め込まない
    assetsInlineLimit: (file) => (file.includes('flag-icons') ? false : undefined),
  },
  plugins: [
    {
      // ドメインの直下に来た人をアプリに転送する（Cloudflare Pages の _redirects）
      name: 'root-redirects',
      apply: 'build',
      async closeBundle() {
        await writeFile(
          'dist/_redirects',
          [`/ /${APP_PATH}/ 302`, `/${APP_PATH} /${APP_PATH}/ 301`, ''].join('\n'),
        );
      },
    },
  ],
});
