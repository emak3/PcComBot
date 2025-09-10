const { Events } = require("discord.js");
const config = require("../../app/config.js");
const log = require("../../core/logger.js");
const DiscordHelpers = require("../../utils/discordHelpers.js");
const ErrorHandler = require("../../utils/errorHandler.js");

/**
 * ギルドメンバー脱退時の処理 - タイムアウト中のメンバーのBAN処理
 * @module GuildMemberRemoveEvent
 */
module.exports = {
    name: Events.GuildMemberRemove,
    /**
     * メンバー脱退時の処理を実行
     * @param {GuildMember} member - 脱退したメンバー
     */
    async execute (member) {
        return await ErrorHandler.standardTryCatch(async () => {
            if (member.guild.id !== config.pccomId) return;
            if (!member.communicationDisabledUntilTimestamp) return;

            log.debug(`メンバー脱退(タイムアウト中): ${member.id}`);

            // ユーザー名のフォーマットを統一
            const username = member.user.discriminator !== "0" ?
                `**${member.user.username}** ( ${member.user.username}#${member.user.discriminator} )` :
                member.user.globalName ? `**${member.user.globalName}** ( @${member.user.username} )` : ` **@${member.user.username}**`;

            const today = new Date();
            const date = new Date(member.user.createdAt);
            const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000; // 14日をミリ秒で
            const accountAge = today.getTime() - date.getTime();

            if (accountAge < fourteenDaysInMs) {
                // 14日未経過のアカウントがタイムアウト中に脱退した場合、BANする
                await member.ban({ reason: "タイムアウト中に抜けた為、BANしました。" });

                // BAN通知用のEmbedを作成
                const banEmbed = DiscordHelpers.createErrorEmbed(
                    "タイムアウト中に抜けた為、BANしました。",
                    null
                );
                banEmbed.setAuthor({
                    name: username,
                    iconURL: member.displayAvatarURL({ dynamic: true }),
                    url: `https://discord.com/users/${member.id}`
                });
                banEmbed.setColor("#e73e77");

                // 通知チャンネルに送信
                const noticeChannel = member.client.channels.cache.get(config.timeoutNotice);
                if (noticeChannel) {
                    await DiscordHelpers.safeMessageSend(noticeChannel, {
                        content: `<@${member.id}>`,
                        embeds: [banEmbed]
                    });
                }

                log.info(`14日未経過アカウントがタイムアウト中に脱退したためBAN処理を実行: ${member.id}`);
            }
        }, "メンバー脱退処理", log);
    }
};
