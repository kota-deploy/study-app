# コースを追加する手順

このアプリは `index.html` をダブルクリックで開く（file://）方式です。ブラウザはフォルダの中身を自動で読めないため、コースは `index.html` に `<script>` タグを足して登録します。

## 手順

1. `courses/_template/` をコピーして `courses/<新しいID>/` にする（例: `courses/english/`）。
2. `data.js` と `course.js` の `DATA_TEMPLATE_` を、コースごとの名前（例: `DATA_ENGLISH_`）に置き換える。
3. `course.js` の `id`・`title`・`subtitle`・`mark`（ホームに出す1文字）を書き換える。
4. `data.js` を書く。
   - `editions`: 版の定義。版がないコースは、`from: null, to: null` の版を1つだけ書く。
   - `levels`: そのコースで使う「級」の選択肢（「級未確認」は残しておく）。
   - 出典（`SOURCES`）、学習計画（`PLAN`）、解説（`LESSONS`）、問題（`DRILLS`）、カード（`CARDS`）。
5. `index.html` の「コース」の欄に、簿記と同じ形で `<script>` を追加する（`course.js` を最後に）。
6. `sw.js` の `APP_FILES` にも同じファイルを追加する（オフラインで開けるように。テストが一覧の漏れを検出します）。
7. `node tests/run-all.js` で検証し、ブラウザを再読み込みする。

## 問題の形式

| type | 中身 | 採点 |
|---|---|---|
| `journal` | 仕訳。`answer: { debit: [{account, amount}], credit: [...] }` | 科目と金額の完全一致（行の順序は問わない）。勘定科目マスター（`accounts`）が必要 |
| `numeric` | 計算。`answer`（数値）、`unit`、`decimals` | 指定の小数桁に丸めて比較 |
| `choice` | 選択。`choices`（配列）、`answer`（正解の番号、0から） | 番号の一致 |

## 共通の項目

すべての解説・問題・カードに、次を付けます（検証スクリプトが確認します）。

- `id`（コース内で重複しない）
- `level`（`levels` のどれか。版で違う場合は `{ "版ID": "級", ... }`）
- `appliesTo`（版のID、または `allEditionsLabel`）
- `source: [{ ref: '出典のキー', loc: '該当箇所' }]`
- 自信がないものは `needsReview: true`

学習記録はコースIDごとに分けて保存されるので、コースを追加しても既存の記録には影響しません。
