// eslint-disable-next-line no-unused-vars
const { ButtonInteraction, ContainerBuilder, ButtonStyle, MessageFlags } = require("discord.js");
// const log = require("../../../core/logger.js");
// const config = require("../../../app/config.js");

/**
 * @param {ButtonInteraction} interaction
 */
module.exports = async function (interaction) {
    if (interaction.customId.startsWith("lockch")) {
        const member = interaction.customId.split("_")[1];
        const clauseContainer = new ContainerBuilder()
            .setAccentColor(0xD13F3F)
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent("再び入力可能にする"),
                        textDisplay => textDisplay
                            .setContent("-# テキストが入力できる状態に戻ります。")
                    )
                    .setButtonAccessory(
                        button => button
                            .setCustomId(`unlockch_${member}`)
                            .setLabel("🔓 Unlock")
                            .setStyle(ButtonStyle.Primary)
                    )
            )
            .addSeparatorComponents(
                separator => separator
            )
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent("チャンネルを削除する"),
                        textDisplay => textDisplay
                            .setContent("-# 運営だけが閲覧可能なチャンネルになります。")
                    )
                    .setButtonAccessory(
                        button => button
                            .setCustomId(`deletech_${member}`)
                            .setLabel("🗑️ Delete")
                            .setStyle(ButtonStyle.Danger)
                    )
            );

        await interaction.channel.permissionOverwrites.edit(member, {
            SendMessages: false
        });

        await interaction.reply({
            components: [clauseContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
