const { Events, EmbedBuilder } = require("discord.js");
const config = require("../config.js");
const log = require("../logger.js");

module.exports = {
    name: Events.GuildMemberRemove,
    async execute (member) {
        if (member.guild.id !== config.pccomId) return;
        if (!member.communicationDisabledUntilTimestamp) return;
        log.debug(member.id);
        const username = member.user.discriminator !== "0" ?
            `**${member.user.username}** ( ${member.user.username}#${member.user.discriminator} )` : member.user.globalName ? `**${member.user.globalName}** ( @${member.user.username} )` : ` **@${member.user.username}**`;
        const today = new Date();
        const date = new Date(member.user.createdAt);
        const diff = 14 * 24 * 60 * 60 * 1000;
        const delta = today.getTime() - date.getTime();
        if (delta < diff) {
            await member.ban({ reason: "タイムアウト中に抜けた為、BANしました。" });
            member.client.channels.cache.get(config.timeoutNotice)
                .send({
                    content: `<@${member.id}>`,
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#e73e77")
                            .setTitle("タイムアウト中に抜けた為、BANしました。")
                            .setAuthor({ name: username, iconURL: member.displayAvatarURL({ dynamic: true }), url: `https://discord.com/users/${member.id}` })
                    ]
                });
        }
    }
};
