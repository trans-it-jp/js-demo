# js-demo — JavaScript 学習デモ

[English](Readme.en.md)

数学・理科・情報・データサイエンス・統計・人工知能の「式や説明だけではつかみにくい概念」を、操作して確かめられるデモにして公開しています。[トランジット株式会社](https://trans-it.jp/)が制作しています。

公開先: **https://trans-it-jp.github.io/js-demo/**

| デモ | 内容 | 日本語 | English |
| --- | --- | --- | --- |
| k-means 法 | 割当と中心の更新を 1 手ずつ進める | [/k-means/](https://trans-it-jp.github.io/js-demo/k-means/) | [/en/k-means/](https://trans-it-jp.github.io/js-demo/en/k-means/) |
| 2D 座標変換 | 一次変換から任意点中心の回転まで 5 レッスン | [/linear-transformation/](https://trans-it-jp.github.io/js-demo/linear-transformation/) | [/en/linear-transformation/](https://trans-it-jp.github.io/js-demo/en/linear-transformation/) |

## 設計の方針

どの題材も、操作して眺めるだけで終わらせない作りにしています。

1. **問い** — 何を考えるか、前提と到達点を短く示す
2. **予想** — 動かす前に一つの変化を予想する
3. **操作** — 一つの条件を変え、図・数値・式の対応を見る
4. **比較** — 元の条件や反例と並べて確かめる
5. **説明** — なぜ変わったか、何は変わらないかを言い直す
6. **転移** — 別の値や例でも説明できるか確かめる

あわせて、次のことを守っています。

- 無料で開けます。アカウント登録や別商品の購入を学習の条件にしません。
- 広告・解析タグ・外部への情報送信を置いていません。入力はブラウザの中だけで処理します。
- 各デモに前提・到達点・モデルの限界を書きます。学習指導要領準拠や成績向上は掲げません。
- 情報を色だけで伝えません。形・破線・番号・数値を併用します。
- どの値もスライダーやドラッグだけでなく、数値入力でも変えられます。
- 乱数は種を固定できます。同じ種なら必ず同じ初期状態になります。

## フォルダ構成

日本語版を既定の場所に置き、英語版を `en/` の下に同じ階層で置いています。公開URLは変えません。

```
/
├── index.html                      日本語のトップ（デモ目録）
├── Readme.md / Readme.en.md        このファイル
├── k-means.html                    旧URL。/k-means/ へ転送する
│
├── css/
│   └── site.css                    共通デザイン（配色・字・レイアウト）
│
├── js/                             用途ごとに分けたライブラリ
│   ├── core/                       乱数と数値の整形
│   ├── linear-algebra/             同次座標の行列演算
│   ├── clustering/                 k-means の手順
│   ├── viz/                        座標平面と散布図の描画
│   └── ui/                         操作部品・表・日英の文言
│
├── k-means/
│   ├── index.html                  日本語
│   └── app.js                      画面側（日英で共用）
│
├── linear-transformation/
│   ├── index.html                  日本語のレッスン一覧
│   ├── Readme.md / Readme.en.md    行列の解説・例題・チートシート
│   ├── pages/*.html                日本語のレッスン 5 枚
│   └── app/lesson.js               5 レッスン共通の画面側
│
├── en/                             英語版。日本語版と同じ階層
│   ├── index.html
│   ├── k-means/index.html
│   └── linear-transformation/
│       ├── index.html
│       └── pages/*.html
│
├── tests/                          計算の検証（Node とブラウザの両方で走る）
├── tools/                          リンクとコントラスト比の点検
├── guides/                         題材追加の手順、アクセシビリティ確認票
└── templates/demo.html             デモページの雛形
```

## ライブラリ

デモの中身は `js/` の下で用途ごとに分けています。各フォルダに使い方の説明があります。

| フォルダ | 役割 | 説明 |
| --- | --- | --- |
| [`js/core`](js/core/Readme.md) | 種を指定できる乱数、丸めと入力値の正規化 | 描画も DOM も扱わない土台 |
| [`js/linear-algebra`](js/linear-algebra/Readme.md) | 3×3 行列の生成・合成・点への適用 | ブラウザなしで既知値と照合できる |
| [`js/clustering`](js/clustering/Readme.md) | k-means の状態機械と合成データ生成 | 割当と中心の更新を 1 手ずつ進める |
| [`js/viz`](js/viz/Readme.md) | 座標平面と散布図の描画 | 計算は持たず、渡された値を図にする |
| [`js/ui`](js/ui/Readme.md) | 入力部品・数値の表・日英の文言 | ページ固有の事情は各デモ側に置く |

依存は一方向です。`core` → `linear-algebra` / `clustering` → `viz` / `ui` → 各デモ。デモ側のコードから `core` を直接使うこともあります。

ビルド手順はありません。`<script>` で順に読み込むと `window.JsDemo` に登録されていきます。外部の依存は D3.js v7 だけで、CDN から版を固定して読み込みます。

## 公開前の確認

ビルド手順は無いが、公開前に通すものが 3 つある。外部パッケージは使わない。

```bash
node tests/run.js              # 計算の照合。1 件でも落ちたら公開しない
node tools/check-links.js      # リンク切れと日英ページの対応
node tools/check-contrast.js   # 色のコントラスト比（文字 4.5:1、部品・図 3:1）
node tools/check-controls.js   # スライダーと数値入力の範囲が揃っているか
node tools/check-transitions.js # 色をアニメーションさせていないか
```

同じ検証はブラウザでも開ける（[tests/index.html](tests/index.html)）。

自動で測れないもの（キーボード操作・読み上げ・実機・投影）は[アクセシビリティ確認票](guides/accessibility.md)に沿って人が確かめる。確認票を埋めることは WCAG 適合の証明ではない。

## 題材を追加する

[題材を追加する手順](guides/adding-a-demo.md)と[デモページの雛形](templates/demo.html)がある。雛形には学習の 6 段階（問い・予想・操作・比較・説明・転移）が印で入っている。

## 手元で開く

`file://` でも動きますが、ページ間のリンクを確かめるには簡単なサーバを立てるのが確実です。

```bash
python -m http.server 8000
```

その後 `http://localhost:8000/` を開きます。

## 言語の追加

文言は 2 か所に分かれています。

- **HTML に固定で書ける文** — 見出し・導入・確認事項など。各言語のページに直接書きます。
- **状態によって変わる文** — いまの段階、反復回数、表の見出しなど。[`js/ui/i18n.js`](js/ui/Readme.md) の辞書に入れます。

`i18n.js` は `<html lang>` を見て辞書を選ぶので、デモの画面側スクリプトは日英で 1 本のまま使えます。

## 現在の状態と未対応

公開しているものは題材の試作です。次の点は未了として扱っています。

- 学習効果の確認は行っていません。試用は未実施です。
- 対応端末の実機確認は未了です。拡大・投影・小画面での表示は設計上対応していますが、実機で確かめていません。
- 図形の描画はポインタ操作だけで、キーボードからは行えません。パラメータはすべて数値入力でも変えられます。

## ライセンス

| 対象 | ライセンス |
| --- | --- |
| ソースコード | [MIT License](LICENSE) |
| 教材本文（問い・解説・ヒント・教師向けの記述・Readme の解説） | [CC BY 4.0](LICENSE-CONTENT) |

**出典を示せば、改変も再配布もできます。商用利用も含みます。** 教員が自分の教材へ取り込むことを想定しています。

表示の例:

```
「JavaScript 学習デモ」トランジット株式会社 / CC BY 4.0
https://trans-it-jp.github.io/js-demo/
```

対象の内訳・著作権者・第三者の部品は [NOTICE](NOTICE) にまとめています。D3.js は CDN から読み込んでおり、このリポジトリでは再配布していません（ISC License）。

学習指導要領への準拠や、学習効果・成績向上は保証していません。

## 問い合わせ

誤りの指摘・改善の提案は [トランジット株式会社](https://trans-it.jp/) へお寄せください。個人情報を含む内容は送らないでください。
