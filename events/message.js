// eslint-disable-next-line no-unused-vars
const { Events, Message } = require("discord.js");
module.exports = {
    name: Events.MessageCreate,
    /**
     * @param {Message} message
     */
    async execute(message) {
        for (const value of message.client.messages) {
            await value(message);
        }
    }
}
