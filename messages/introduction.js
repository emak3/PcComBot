// eslint-disable-next-line no-unused-vars
const { Message } = require("discord.js");
const config = require("../config.js");
/**
 * @param {Message} message
 */
module.exports = async function (message) {
    if (message.channel.id === config.pcsyokaiId) {
        if (message.author.bot) return;
        const messages = await message.channel.messages.fetch({ limit: 20 });
        const filtered = messages.filter((message) => message.author.bot);
        message.channel
            .bulkDelete(filtered)
            .then(
                message.channel.send("PCを自慢したい？! ここに写真やスペックを投稿してください！\n( Want to show off your build? Post your pictures and specs here! )")
            )
            .catch((e) => e.message);
    }
}
