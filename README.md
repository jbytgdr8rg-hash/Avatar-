# 今日の世界の窓 — Webアプリ版

写真を主役にした、インストール可能なPWAです。GitHub Pages、Netlify、Vercelなどの静的ホスティングにそのまま配置できます。

## 起動

```bash
python3 -m http.server 8080
```

ブラウザで `http://localhost:8080` を開きます。

## GitHub Pages

1. このフォルダの中身をリポジトリ直下へ配置
2. GitHubの Settings → Pages
3. Deploy from a branch を選択
4. `main` / `/ (root)` を指定

## Unsplashを使う場合

`config.js` の `UNSPLASH_ACCESS_KEY` にAccess Keyを設定します。未設定時はWikimedia Commonsのみで動きます。

```js
window.WORLD_WINDOW_CONFIG = {
  UNSPLASH_ACCESS_KEY: "",
  AUTO_ADVANCE_MS: 0
};
```

## 構成

- `index.html` UI
- `styles.css` デザイン
- `app.js` 画像・天気・時刻・スワイプ制御
- `config.js` API設定
- `manifest.webmanifest` PWA設定
- `sw.js` アプリ本体のキャッシュ
- `icons/` ホーム画面アイコン

外部画像と天気は通信が必要です。オフライン時もアプリ本体は起動しますが、新しい景色の取得はできません。
