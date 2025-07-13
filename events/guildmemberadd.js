// eslint-disable-next-line no-unused-vars
const { Events, EmbedBuilder, GuildMember } = require("discord.js");
const log = require("../logger.js");
const config = require("../config.js");
module.exports = {
    name: Events.GuildMemberAdd,
    /**
     *
     * @param {GuildMember} member
     * @returns
     */
    async execute (member) {
        if (member.guild.id !== config.pccomId) return;
        log.debug(member.id);
        const user = member.user;
        const username = user.discriminator !== "0" ?
            `**${user.username}** ( ${user.username}#${user.discriminator} )` : user.globalName ? `**${user.globalName}** ( @${user.username} )` : ` **@${user.username}**`;
        const today = new Date();
        const date = new Date(user.createdAt);
        const diff = 14 * 24 * 60 * 60 * 1000;
        const delta = today.getTime() - date.getTime();
        if (delta < diff) {
            await member.timeout((user.createdTimestamp + 1209600000) - new Date().getTime());
            log.debug("14日未経過");
            member.client.channels.cache.get(config.timeoutNotice)
                .send({
                    content: `<@${member.id}>`,
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#e73e77")
                            .setTitle("14日未経過")
                            .setAuthor({ name: username, iconURL: user.displayAvatarURL({ dynamic: true }), url: `https://discord.com/users/${member.id}` })
                            .addFields(
                                { name: "アカウント作成日時", value: "<t:" + Math.floor(user.createdTimestamp / 1000) + ">", inline: true },
                                { name: "タイムアウト解除日時", value: "<t:" + Math.floor((user.createdTimestamp + 1209600000) / 1000) + ">", inline: true }
                            )
                            .setDescription("タイムアウト中に脱退した場合、BANの処置をいたします (白目)")
                    ]
                });
            member.roles.add(config.timeoutMemberRoleId);
        } else {
            log.debug("14日以上経過");
        }
    }
};
