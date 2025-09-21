const { MessageFlags } = require("discord.js");
const log = require("../../../core/logger.js");
const modalStorage = require("../../../core/modalStorage.js");

module.exports = async function (interaction) {
    if (!interaction.customId.startsWith('send_json_modal_')) return;

    try {
        const jsonInput = interaction.fields.getTextInputValue('json_input');
        const targetChannelId = interaction.customId.replace('send_json_modal_', '');

        modalStorage.saveLastInput(interaction.user.id, 'send_json', jsonInput);

        let messageData;
        let cleanedJson = jsonInput;
        try {
            // JSONクリーニング処理 - より安全な方法
            const lines = jsonInput.split('\n');
            const cleanedLines = lines.map(line => {
                // 文字列内でないコメントのみ削除
                let inString = false;
                let escaped = false;
                let result = '';

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    const nextChar = line[i + 1];

                    if (escaped) {
                        result += char;
                        escaped = false;
                        continue;
                    }

                    if (char === '\\' && inString) {
                        escaped = true;
                        result += char;
                        continue;
                    }

                    if (char === '"') {
                        inString = !inString;
                        result += char;
                        continue;
                    }

                    if (!inString && char === '/' && nextChar === '/') {
                        break; // 行コメント開始なので残りは無視
                    }

                    // 制御文字削除（文字列内以外）
                    if (!inString && char.charCodeAt(0) < 32 && char !== '\t') {
                        continue;
                    }

                    result += char;
                }

                return result.trim();
            });

            cleanedJson = cleanedLines.join('\n')
                .replace(/\/\*[\s\S]*?\*\//g, '')  // ブロックコメント削除
                .replace(/,(\s*[}\]])/g, '$1');  // 末尾カンマ削除

            // 不足しているカンマを自動追加
            cleanedJson = cleanedJson.replace(/("[^"]*")\s*\n\s*("[^"]*"\s*:)/g, '$1,\n$2');
            cleanedJson = cleanedJson.replace(/(}\s*)\n(\s*{)/g, '$1,\n$2');

            messageData = JSON.parse(cleanedJson);
        } catch (error) {
            return await interaction.reply({
                content: `❌ 無効なJSONフォーマットです。エラー: ${error.message}\n\nクリーニング後のJSON: \`\`\`json\n${cleanedJson ? cleanedJson.substring(0, 1500) : 'undefined'}\`\`\``,
                flags: MessageFlags.Ephemeral
            });
        }

        const targetChannel = interaction.guild.channels.cache.get(targetChannelId) ||
                            interaction.client.channels.cache.get(targetChannelId);

        if (!targetChannel) {
            return await interaction.reply({
                content: '❌ 指定されたチャンネルが見つかりません。',
                flags: MessageFlags.Ephemeral
            });
        }

        if (!targetChannel.isTextBased()) {
            return await interaction.reply({
                content: '❌ 指定されたチャンネルはテキストチャンネルではありません。',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await targetChannel.send(messageData);

            await interaction.reply({
                content: `✅ メッセージを ${targetChannel} に送信しました。`,
                flags: MessageFlags.Ephemeral
            });

            log.info(`Message sent to ${targetChannel.name} (${targetChannel.id}) by ${interaction.user.tag}`);
        } catch (sendError) {
            log.error('Send error:', sendError);
            return await interaction.reply({
                content: `❌ メッセージ送信エラー: ${sendError.message}\n送信データ: \`\`\`json\n${JSON.stringify(messageData, null, 2).substring(0, 1000)}\`\`\``,
                flags: MessageFlags.Ephemeral
            });
        }

    } catch (error) {
        log.error('Modal error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ 処理エラー: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
};