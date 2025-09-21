const { SlashCommandBuilder, MessageFlags, InteractionContextType, PermissionFlagsBits, ChannelType } = require("discord.js");
const log = require("../../core/logger.js");

/**
 * @module getMessageCommand
 */
module.exports = {
    command: new SlashCommandBuilder()
        .setName("getmessage")
        .setDescription("指定したメッセージのJSONデータを取得する")
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('取得するメッセージのID')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('メッセージがあるチャンネル（省略時は現在のチャンネル）')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false))
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    /**
     * @param {CommandInteraction} interaction
     */
    async execute(interaction) {
        const messageId = interaction.options.getString('message_id');
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            const message = await targetChannel.messages.fetch(messageId);

            // メッセージデータをJSON形式で整形
            const messageData = {
                content: message.content || undefined,
                embeds: message.embeds.length > 0 ? message.embeds.map(embed => embed.toJSON()) : undefined,
                components: message.components.length > 0 ? message.components.map(component => component.toJSON()) : undefined,
                attachments: message.attachments.size > 0 ? Array.from(message.attachments.values()).map(attachment => ({
                    url: attachment.url,
                    name: attachment.name,
                    size: attachment.size
                })) : undefined,
                tts: message.tts || undefined,
                flags: message.flags.bitfield !== 0 ? message.flags.bitfield : undefined
            };

            // undefinedのプロパティを削除
            Object.keys(messageData).forEach(key => {
                if (messageData[key] === undefined) {
                    delete messageData[key];
                }
            });

            const jsonString = JSON.stringify(messageData, null, 2);

            // JSONが長すぎる場合はファイルとして送信
            if (jsonString.length > 1900) {
                const buffer = Buffer.from(jsonString, 'utf-8');

                await interaction.reply({
                    content: `✅ メッセージ ${messageId} のJSONデータ (${targetChannel} から):`,
                    files: [{
                        attachment: buffer,
                        name: `message_${messageId}.json`
                    }]
                });
            } else {
                await interaction.reply({
                    content: `✅ メッセージ ${messageId} のJSONデータ (${targetChannel} から):\n\`\`\`json\n${jsonString}\`\`\``
                });
            }

            log.info(`Message JSON retrieved: ${messageId} from ${targetChannel.name} (${targetChannel.id}) by ${interaction.user.tag}`);

        } catch (error) {
            log.error('Get message error:', error);

            if (error.code === 10008) {
                await interaction.reply({
                    content: `❌ メッセージが見つかりません。メッセージID \`${messageId}\` が ${targetChannel} に存在するか確認してください。`,
                    flags: MessageFlags.Ephemeral
                });
            } else if (error.code === 50001) {
                await interaction.reply({
                    content: `❌ アクセス権限がありません。チャンネル ${targetChannel} のメッセージを読む権限がありません。`,
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: `❌ メッセージ取得エラー: ${error.message}`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};