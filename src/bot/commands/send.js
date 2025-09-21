const { SlashCommandBuilder, ContainerBuilder, ButtonStyle, MessageFlags, InteractionContextType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelType } = require("discord.js");
const config = require("../../app/config.js");
const log = require("../../core/logger.js");
const modalStorage = require("../../core/modalStorage.js");

/**
 *
 * @module sendCommand
 */
module.exports = {
    command: new SlashCommandBuilder()
        .setName("send")
        .setDescription("Discord APIのJSONを使ってメッセージを送信する")
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('送信先のチャンネル')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true))
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    /**
     *
     * @param {CommandInteraction} interaction
     */
    async execute(interaction) {
        const targetChannel = interaction.options.getChannel('channel');
        const lastInput = modalStorage.getLastInput(interaction.user.id, 'send_json');

        const modal = new ModalBuilder()
            .setCustomId(`send_json_modal_${targetChannel.id}`)
            .setTitle('Discord API JSON 入力');

        const jsonInput = new TextInputBuilder()
            .setCustomId('json_input')
            .setLabel('Discord API JSON')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Discord APIのJSONフォーマットでメッセージデータを入力してください\n例: {"content": "Hello World!"}')
            .setRequired(true)
            .setMaxLength(4000)
            .setValue(lastInput);

        const actionRow = new ActionRowBuilder().addComponents(jsonInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    }
};
