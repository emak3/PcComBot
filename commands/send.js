const { SlashCommandBuilder, ContainerBuilder, ButtonStyle, MessageFlags, InteractionContextType, PermissionFlagsBits } = require("discord.js");
const config = require("../config.js");
const log = require("../logger.js");

/**
 *
 * @module sendCommand
 */
module.exports = {
    command: new SlashCommandBuilder()
        .setName("send")
        .setDescription("あらかじめ設定しておいたものを送信する")
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    /**
     *
     * @param {CommandInteraction} interaction
     */
    async execute(interaction) {
        const clauseContainer = new ContainerBuilder()
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent("## 📖 Community Rules"),
                        textDisplay => textDisplay
                            .setContent("メンバーが快適に過ごすためのルールです。必ずお読みください。\n-# These are the rules to ensure everyone has a comfortable experience. Please read them carefully.")
                    )
                    .setButtonAccessory(
                        button => button
                            .setLabel('Community Rules')
                            .setURL('https://pcb.ouma3.org/rules')
                            .setStyle(ButtonStyle.Link)
                    )
            )
            .addSeparatorComponents(
                separator => separator
            )
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent("## ❓ Question Guidelines"),
                        textDisplay => textDisplay
                            .setContent("質問をスムーズに解決するためのガイドラインです。必ず読んでから質問してください。\n-# These guidelines help resolve questions smoothly. Please read them before asking questions.")
                    )
                    .setButtonAccessory(
                        button => button
                            .setLabel('Question Guidelines')
                            .setURL('https://pcb.ouma3.org/guidelines')
                            .setStyle(ButtonStyle.Link)
                    )
            )
            .addSeparatorComponents(
                separator => separator
            )
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent("## 📮 Contact Administrators"),
                        textDisplay => textDisplay
                            .setContent("サポートが必要な場合はこちらをご利用ください。\n-# If you need support, please use this.")
                    )
                    .setButtonAccessory(
                        button => button
                            .setLabel('Contact Administrators')
                            .setURL('https://pcb.ouma3.org/support')
                            .setStyle(ButtonStyle.Link)
                    )
            );
        await interaction.reply({
            content: "aa",
            flags: MessageFlags.Ephemeral
        });

        await interaction.channel.send({
            components: [clauseContainer],
            flags: MessageFlags.IsComponentsV2
        })
    }
};
