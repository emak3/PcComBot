// eslint-disable-next-line no-unused-vars
const { BaseInteraction } = require("discord.js");
/**
 * @param {BaseInteraction} interaction
 */
module.exports = async function (interaction) {
    if (!interaction.isButton()) return;
    for (const value of interaction.client.buttons) {
        await value(interaction);
    }
}
