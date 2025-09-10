// eslint-disable-next-line no-unused-vars
const { Events, GuildMember } = require("discord.js");
const log = require("../../core/logger.js");
const config = require("../../app/config.js");
const DiscordHelpers = require("../../utils/discordHelpers.js");
const ErrorHandler = require("../../utils/errorHandler.js");

/**
 * ギルドメンバー参加時の処理 - 新規アカウントの14日チェックとタイムアウト処理
 * @module GuildMemberAddEvent
 */
module.exports = {
    name: Events.GuildMemberAdd,
    /**
     * メンバー参加時の処理を実行
     * @param {GuildMember} member - 参加したメンバー
     */
    async execute (member) {
        return await ErrorHandler.standardTryCatch(async () => {
            if (member.guild.id !== config.pccomId) return;

            log.debug(`メンバー参加: ${member.id}`);
            const user = member.user;

            // ユーザー名のフォーマットを統一
            const username = user.discriminator !== "0" ?
                `**${user.username}** ( ${user.username}#${user.discriminator} )` :
                user.globalName ? `**${user.globalName}** ( @${user.username} )` : ` **@${user.username}**`;

            const today = new Date();
            const date = new Date(user.createdAt);
            const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000; // 14日をミリ秒で
            const accountAge = today.getTime() - date.getTime();

            if (accountAge < fourteenDaysInMs) {
                // 14日未経過のアカウントの場合、タイムアウトを実行
                const timeoutDuration = (user.createdTimestamp + fourteenDaysInMs) - new Date().getTime();
                await member.timeout(timeoutDuration);

                log.debug("14日未経過のアカウントをタイムアウトしました");

                // 通知用のEmbedを作成
                const timeoutEmbed = DiscordHelpers.createWarningEmbed(
                    "14日未経過",
                    "タイムアウト中に脱退した場合、BANの処置をいたします (白目)",
                    {
                        fields: [
                            { name: "アカウント作成日時", value: `<t:${Math.floor(user.createdTimestamp / 1000)}>`, inline: true },
                            { name: "タイムアウト解除日時", value: `<t:${Math.floor((user.createdTimestamp + fourteenDaysInMs) / 1000)}>`, inline: true }
                        ]
                    }
                );
                timeoutEmbed.setAuthor({
                    name: username,
                    iconURL: user.displayAvatarURL({ dynamic: true }),
                    url: `https://discord.com/users/${member.id}`
                });
                timeoutEmbed.setColor("#e73e77");

                // 通知チャンネルに送信
                const noticeChannel = member.client.channels.cache.get(config.timeoutNotice);
                if (noticeChannel) {
                    await DiscordHelpers.safeMessageSend(noticeChannel, {
                        content: `<@${member.id}>`,
                        embeds: [timeoutEmbed]
                    });
                }

                // タイムアウトメンバーロールを付与
                await member.roles.add(config.timeoutMemberRoleId);
            } else {
                log.debug("14日以上経過したアカウントのため、タイムアウトは実行しません");
            }
        }, "メンバー参加処理", log);
    }
};
