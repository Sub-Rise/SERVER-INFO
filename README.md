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

2. 依存関係をインストール
```bash
npm install
```

3. 環境変数を設定
```bash
cp .env.example .env
# .env ファイルを編集して各値を設定
```

4. スラッシュコマンドを登録
```bash
npm run deploy
```

5. Botを起動
```bash
npm start
```

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

2. FFmpeg Buildpack を追加
```bash
heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
```

3. 環境変数を設定
```bash
heroku config:set DISCORD_TOKEN=your_token_here
# 他の環境変数も同様に設定
```

4. デプロイ
```bash
git push heroku main
```

5. Workerを有効化
```bash
heroku ps:scale worker=1
```

## 注意事項

- `config.json` は開発用です。本番環境では必ず環境変数を使用してください
- Spotify機能を使用する場合は [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) でアプリを作成してください
- FFmpegが必要です。ホスティングサービスによっては別途インストールが必要です

## ライセンス

ISC
