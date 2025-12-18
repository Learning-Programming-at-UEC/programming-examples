# programming-examples

簡単なアプリを公開するためのリポジトリです。

## アプリの追加

`packages`配下に任意の名前でディレクトリを作り、その中でアプリを開発してください。

### 静的ファイルの追加

1. 任意の名前のアプリディレクトリを作成する。
2. アプリディレクトリに`dist`ディレクトリを作成する。
3. `dist`ディレクトリに必要なファイルを全て入れる。

### 静的ファイルを出力する Node.js アプリ

1. 任意の名前のアプリディレクトリを作成する。
2. アプリディレクトリに開発したアプリを入れる。
3. `package.json`の`scripts`で`build`スクリプトを実行するとビルドされるように設定しておく。
4. ビルド成果物の出力先を`dist`ディレクトリに設定しておく。

## デプロイ (GitHub Pages)

-   `main`ブランチへ push すると自動でビルド＆デプロイされます。
-   手動で実行したい場合は Actions の`workflow_dispatch`から実行できます。
-   ワークフローファイル: `.github/workflows/deploy.yml`

## デプロイ結果

-   ルートの`index.html`がそのままルートページになります。
-   各アプリはアプリのディレクトリ名がルーティングになります。

出力例

```
index.html          # ルート
sample-static-app/  # packages/sample-static-app の成果物
sample-vite-app/    # packages/sample-vite-app の成果物
sample-vite-app2/   # packages/sample-vite-app2 の成果物
```
