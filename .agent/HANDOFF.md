# プロジェクト引き継ぎドキュメント

## プロジェクト概要

- **名前**: Multifunctional Discord Bot
- **種類**: Discord.js v14 + DisTube v5 を使用した多機能Discord Bot
- **ディレクトリ**: `c:\Users\cxss\Downloads\servser ingfoooooooooo`

## 技術スタック

- Node.js 18.x以上
- Discord.js v14
- DisTube v5（音楽再生）
- FFmpeg（音声処理）

## 主な機能

- 音楽再生（YouTube/Spotify対応）
- サーバー情報パネル（リアルタイム更新）
- ミュートログ機能
- 自動退出機能

## リポジトリ情報

| 項目 | 値 |
|------|-----|
| GitHub URL | <https://github.com/Sub-Rise/SERVER-INFO> |
| ブランチ | `main` |
| 公開設定 | **非公開（Private）** |
| Git ユーザー名 | `Sub-Rise` |
| Git メール | `xyshed5254@gmail.com` |

## ホスティング

- **サービス**: Wispbyte
- **連携方法**: GitHub Integration
- **起動コマンド**: `npm start` または `node src/index.js`

## 重要なファイル

| ファイル | 説明 | Git管理 |
|----------|------|---------|
| `config.json` | Bot設定（トークン等） | ✅ 含む（非公開リポのため） |
| `.env` | 環境変数 | ❌ 除外 |
| `.env.example` | 環境変数テンプレート | ✅ 含む |
| `src/index.js` | エントリーポイント | ✅ 含む |

## 開発ワークフロー

### ローカルでの変更をデプロイ

```bash
# 1. 変更をコミット
git add .
git commit -m "変更内容の説明"
git push

# 2. Wispbyteで「GitHub」→「引く」をクリック
# 3. サーバーを再起動
```

### スラッシュコマンドの登録

```bash
npm run deploy
```

## 注意事項

- `.gitignore` で `.env` は除外されている（セキュリティ上正しい）
- `config.json` は非公開リポジトリのためGitHubに含めている
- Wispbyteでは環境変数設定ができないため、設定ファイルをリポジトリに含めている

## 最終更新

- **日時**: 2025-12-31T12:37:55+09:00
- **内容**: GitHubリポジトリ作成、Wispbyteへのデプロイ完了
