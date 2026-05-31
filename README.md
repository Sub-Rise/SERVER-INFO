# Multifunctional Discord Bot

Discord.js v14 と DisTube v5 を使用した多機能Discord Botです。

## 機能

### 音楽機能

- `/play` - 曲を再生（YouTube/Spotify対応）
- `/search` - 曲を検索して選択
- `/queue` - 再生キューを表示
- `/skip` - 現在の曲をスキップ
- `/stop` - 再生を停止
- `/volume` - 音量調整
- `/shuffle` - キューをシャッフル
- `/autoshuffle` - 自動シャッフルモード
- `/loop` - ループモード設定
- `/nowplaying` - 現在再生中の曲を表示
- `/lyrics` - 歌詞を表示
- `/jumpto` - 指定位置へジャンプ

### 管理機能

- `/serverinfo` - サーバー情報パネル（リアルタイム更新）
- `/botstats` - Bot統計情報
- `/ping` - 応答確認

### その他

- ミュートログ機能（VC内のミュート状態変化を記録）
- 自動退出機能（5分間操作なしで自動退出）

## アーキテクチャ

```
src/
├── index.js                    # エントリーポイント
├── deploy-commands.js          # コマンドデプロイスクリプト
├── commands/                   # スラッシュコマンド (15ファイル)
│   ├── play.js, search.js     # 音楽コマンド
│   ├── serverinfo.js          # 管理コマンド
│   └── ...
├── config/                     # 設定
│   ├── constants.js           # 定数定義
│   ├── environment.js         # 環境変数
│   └── networkConfig.js       # ネットワーク設定
├── core/                       # コアロジック
│   ├── distube.js             # DisTubeインスタンス
│   └── distubeEvents/         # イベントハンドラ
├── events/                     # Discordイベント
│   └── discord/
│       ├── ready.js
│       ├── interactionCreate.js
│       └── ...
└── utils/                      # ユーティリティ
    ├── commandWrapper.js      # コマンドラッパー
    ├── musicState.js          # 音楽状態管理
    ├── timers.js              # タイマー管理
    └── ...
```

### 設計原則

- **レイヤードアーキテクチャ**: config → utils → core → commands/events の依存方向
- **責務の分離**: 各モジュールは単一責務を持つ
- **DRY原則**: 共通処理は commandWrapper.js 等に集約

## セットアップ

### 必要要件

- Node.js 18.x 以上
- FFmpeg（音楽再生用）

### ローカル環境

1. リポジトリをクローン

```bash
git clone <repository-url>
cd multifunctional-bot
```

1. 依存関係をインストール

```bash
npm install
```

1. 環境変数を設定

```bash
cp .env.example .env
# .env ファイルを編集して各値を設定
```

1. スラッシュコマンドを登録

```bash
npm run deploy
```

1. Botを起動

```bash
npm start
```

## テスト

Jest を使用したユニットテストが整備されています。

```bash
# テスト実行
npm test

# カバレッジ付きでテスト実行
npm run test:coverage
```

### テスト対象

- `utils/commandWrapper.js` - deferReply エラーハンドリング
- `utils/musicState.js` - 自動シャッフル状態管理

## ホスティングサービスへのデプロイ

### 環境変数

以下の環境変数をホスティングサービスで設定してください：

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `DISCORD_TOKEN` | ✅ | Discord Botトークン |
| `DISCORD_CLIENT_ID` | ✅ | Discord アプリケーションID |
| `DISCORD_OWNER_ID` | ✅ | Bot管理者のDiscord ID |
| `SPOTIFY_CLIENT_ID` | ⚠️ | Spotify API Client ID（Spotify再生用） |
| `SPOTIFY_CLIENT_SECRET` | ⚠️ | Spotify API Client Secret |
| `ADMIN_ROLE_IDS` | ❌ | 管理者ロールID（カンマ区切り） |
| `FABRIX_API_KEY` | ❌ | 歌詞API用キー |
| `ENABLE_MUTE_LOGGING` | ❌ | ミュートログ有効化（true/false） |
| `NODE_ENV` | ❌ | 環境設定（production推奨） |

### Railway

1. [Railway](https://railway.app) でプロジェクトを作成
2. GitHubリポジトリを接続
3. 環境変数を設定
4. 自動デプロイが開始されます

### Render

1. [Render](https://render.com) で新しい Background Worker を作成
2. GitHubリポジトリを接続
3. Build Command: `npm install`
4. Start Command: `node src/index.js`
5. 環境変数を設定

### Heroku

1. Heroku CLI でログイン

```bash
heroku login
heroku create your-bot-name
```

1. FFmpeg Buildpack を追加

```bash
heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
```

1. 環境変数を設定

```bash
heroku config:set DISCORD_TOKEN=your_token_here
# 他の環境変数も同様に設定
```

1. デプロイ

```bash
git push heroku main
```

1. Workerを有効化

```bash
heroku ps:scale worker=1
```

## 注意事項

- `.env` と `config.json` にはBotトークンなどの秘密情報が入るため、Gitにコミットしないでください
- `data/managed-panels.json` は実行時に生成される管理パネル情報です。サーバーIDやチャンネルIDを含むため、Gitにコミットしないでください
- `.agent/` はローカルの作業メモ用です。個人情報や運用情報を含む可能性があるため、Gitにコミットしないでください
- `config.json` はローカル開発や一部ホスティング環境のフォールバック用です。本番環境では可能な限り環境変数を使用してください
- ホスティングサービスで環境変数を使えない場合は、サーバー上で直接 `config.json` を作成し、公開リポジトリには含めないでください
- Discord Botトークンを誤って公開した場合は、Discord Developer Portalで直ちにトークンを再生成してください
- Spotify機能を使用する場合は [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) でアプリを作成してください
- FFmpegが必要です。ホスティングサービスによっては別途インストールが必要です

## ライセンス

ISC
