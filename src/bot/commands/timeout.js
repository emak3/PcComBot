/* eslint-disable no-unused-vars */
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const log = require("../../core/logger.js");
const config = require("../../app/config.js");

module.exports = {
    command: new SlashCommandBuilder()
        .setName("timeout")
        .setNameLocalization("ja", "タイムアウト")
        .setDescription("メンバーをタイムアウトします")
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName("member")
                .setNameLocalization("ja", "メンバー")
                .setDescription("タイムアウトするメンバー")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("duration")
                .setNameLocalization("ja", "期間")
                .setDescription("タイムアウトする期間")
                .setRequired(true)
                .addChoices(
                    { name: "1日", value: "1d" },
                    { name: "3日", value: "3d" },
                    { name: "7日", value: "7d" },
                    { name: "14日", value: "14d" },
                    { name: "28日 (最大)", value: "28d" }
                )
        )
        .addStringOption(option =>
            option.setName("reason")
                .setNameLocalization("ja", "理由")
                .setDescription("タイムアウトする理由")
                .setRequired(true)
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute (interaction) {
        if (interaction.guild.id !== config.pccomId) return await interaction.reply({ content: "<:off:1103782703494611147> This command is not available on this server.", flags: MessageFlags.Ephemeral });

        const targetUser = interaction.options.getUser("member");
        const duration = interaction.options.getString("duration");
        const reason = interaction.options.getString("reason");

        const name = targetUser.discriminator !== "0" ? `${targetUser.username} ( ${targetUser.username}#${targetUser.discriminator} )` : `${targetUser.globalName} ( @${targetUser.username} )`;

        const mem = interaction.guild.members.resolve(targetUser.id);
        if (!mem) return interaction.reply({ content: "メンバーが見つかりません。", flags: MessageFlags.Ephemeral });
        if (mem.communicationDisabledUntilTimestamp) return interaction.reply({ content: "このユーザーはタイムアウト済みです。", flags: MessageFlags.Ephemeral });

        // 期間をミリ秒に変換 (Discordの最大制限は28日)
        const durationMap = {
            "1d": 86400000,     // 1日
            "3d": 259200000,    // 3日
            "7d": 604800000,    // 7日
            "14d": 1209600000,  // 14日
            "28d": 2419200000   // 28日 (Discordの最大制限)
        };

        const timeoutDuration = durationMap[duration];
        const endTime = Date.now() + timeoutDuration;

        try {
            // タイムアウト実行
            await mem.timeout(timeoutDuration, reason);

            // timeoutMemberRoleIdロールを付与
            if (config.timeoutMemberRoleId) {
                await mem.roles.add(config.timeoutMemberRoleId);
            }

            // 実行者への返信
            await interaction.reply({
                content: `${targetUser.tag} をタイムアウトしました。`,
                flags: MessageFlags.Ephemeral
            });

            // timeoutNoticeチャンネルに通知
            if (config.timeoutNotice) {
                const noticeChannel = interaction.guild.channels.cache.get(config.timeoutNotice);
                if (noticeChannel) {
                    const supportButton = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel("解除申請などのサポートはこちら")
                                .setURL("https://pcb.ouma3.org/support")
                                .setStyle(ButtonStyle.Link)
                        );

                    await noticeChannel.send({
                        content: `<@${targetUser.id}>`,
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#fd5757")
                                .setAuthor({ name: name, iconURL: mem.displayAvatarURL({ dynamic: true }), url: `https://discord.com/users/${targetUser.id}` })
                                .setDescription("## Timeout 通知")
                                .addFields(
                                    { name: "理由", value: reason },
                                    { name: "タイムアウト解除日時", value: `<t:${Math.floor(endTime / 1000)}> <t:${Math.floor(endTime / 1000)}:R>` }
                                )
                                .setFooter({ text: `実行者: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                                .setTimestamp()
                        ],
                        components: [supportButton]
                    });
                }
            }

        } catch (error) {
            log.error("タイムアウト実行エラー:", error);
            if (interaction.replied) {
                await interaction.editReply({
                    content: "タイムアウトの実行に失敗しました。",
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: "タイムアウトの実行に失敗しました。",
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};
