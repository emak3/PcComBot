/* eslint-disable no-unused-vars */
const { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, InteractionContextType, ContextMenuCommandBuilder, ApplicationCommandType, MessageFlags } = require("discord.js");
const log = require("../../core/logger.js");
const config = require("../../app/config.js");

module.exports = {
    command: new ContextMenuCommandBuilder()
        .setName("Timeout")
        .setNameLocalization("ja", "タイムアウト")
        .setType(ApplicationCommandType.User)
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.CreatePublicThreads),
    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute (interaction) {
        if (interaction.guild.id !== config.pccomId) return await interaction.reply({ content: "<:off:1103782703494611147> This command is not available on this server.", flags: MessageFlags.Ephemeral });
        const name = interaction.targetUser.discriminator !== "0" ? `${interaction.targetUser.username} ( ${interaction.targetUser.username}#${interaction.targetUser.discriminator} )` : `${interaction.targetUser.globalName} ( @${interaction.targetUser.username} )`;
        //
        log.error(interaction.targetUser.id);
        const mem = interaction.guild.members.resolve(interaction.targetUser.id);
        if (mem.communicationDisabledUntilTimestamp) return interaction.reply({ content: "このユーザーはタイムアウト済みです。", flags: MessageFlags.Ephemeral });
        await mem.timeout(21600000); // 6時間
        interaction.reply({
            content: `<@${interaction.targetUser.id}>`,
            embeds: [
                new EmbedBuilder()
                    .setColor("#fd5757")
                    .setAuthor({ name: name, iconURL: mem.displayAvatarURL({ dynamic: true }), url: `https://discord.com/users/${interaction.targetUser.id}` })
                    .setDescription("## <:timeout:1120759110414106715> Timeout")
                    .addFields(
                        { name: "タイムアウト解除日時", value: `<t:${Math.floor((Date.now() + 21600000) / 1000)}> <t:${Math.floor((Date.now() + 21600000) / 1000)}:R>` }
                    )
                    .setFooter({ text: name, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            ]
        });
    }
};
