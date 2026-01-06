/**
 * commandWrapper.js ユニットテスト
 * deferReply のエラーハンドリングと wrapCommand のテスト
 */

// logger モジュールをモック化
jest.mock('../src/utils/logger', () => jest.fn());

const { safeDeferReply, wrapCommand } = require('../src/utils/commandWrapper');

describe('commandWrapper', () => {
    // テスト前にモックをリセット
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('safeDeferReply', () => {
        it('正常なdeferReplyで true を返す', async () => {
            const mockInteraction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                commandName: 'test',
                user: { id: '123' },
                guild: { id: '456' }
            };

            const result = await safeDeferReply(mockInteraction, {});

            expect(result).toBe(true);
            expect(mockInteraction.deferReply).toHaveBeenCalledWith({});
        });

        it('deferReplyがエラーを投げた場合 false を返す', async () => {
            const mockInteraction = {
                deferReply: jest.fn().mockRejectedValue(new Error('Interaction expired')),
                commandName: 'test',
                user: { id: '123' },
                guild: { id: '456' }
            };

            const result = await safeDeferReply(mockInteraction, {});

            expect(result).toBe(false);
            expect(mockInteraction.deferReply).toHaveBeenCalled();
        });

        it('Unknown Interaction (10062) エラーを適切に処理する', async () => {
            const error = new Error('Unknown Interaction');
            error.code = 10062;

            const mockInteraction = {
                deferReply: jest.fn().mockRejectedValue(error),
                commandName: 'test',
                user: { id: '123' },
                guild: { id: '456' }
            };

            const result = await safeDeferReply(mockInteraction, { ephemeral: true });

            expect(result).toBe(false);
            expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
        });
    });

    describe('wrapCommand', () => {
        it('正常実行時にコマンド関数を呼び出す', async () => {
            const commandFn = jest.fn().mockResolvedValue(undefined);
            const wrappedFn = wrapCommand(commandFn);

            const mockInteraction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                deferred: false,
                replied: false,
                commandName: 'test',
                user: { id: '123' },
                guild: { id: '456' }
            };

            await wrappedFn(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            expect(commandFn).toHaveBeenCalledWith(mockInteraction);
        });

        it('shouldDefer: false の場合、deferReplyを呼ばない', async () => {
            const commandFn = jest.fn().mockResolvedValue(undefined);
            const wrappedFn = wrapCommand(commandFn, { shouldDefer: false });

            const mockInteraction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                deferred: false,
                replied: false,
                commandName: 'test',
                user: { id: '123' },
                guild: { id: '456' }
            };

            await wrappedFn(mockInteraction);

            expect(mockInteraction.deferReply).not.toHaveBeenCalled();
            expect(commandFn).toHaveBeenCalledWith(mockInteraction);
        });

        it('既にdeferされている場合、deferReplyをスキップ', async () => {
            const commandFn = jest.fn().mockResolvedValue(undefined);
            const wrappedFn = wrapCommand(commandFn);

            const mockInteraction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                deferred: true,
                replied: false,
                commandName: 'test',
                user: { id: '123' },
                guild: { id: '456' }
            };

            await wrappedFn(mockInteraction);

            expect(mockInteraction.deferReply).not.toHaveBeenCalled();
            expect(commandFn).toHaveBeenCalledWith(mockInteraction);
        });

        it('コマンド実行中のエラーをキャッチしてfollowUpで通知', async () => {
            const commandFn = jest.fn().mockRejectedValue(new Error('Command failed'));
            const wrappedFn = wrapCommand(commandFn);

            const mockInteraction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                deferred: true,
                replied: false,
                commandName: 'test',
                user: { id: '123' },
                guild: { id: '456' }
            };

            await wrappedFn(mockInteraction);

            expect(commandFn).toHaveBeenCalled();
            expect(mockInteraction.followUp).toHaveBeenCalledWith({
                content: 'コマンド実行中にエラーが発生しました。',
                ephemeral: true
            });
        });
    });
});
