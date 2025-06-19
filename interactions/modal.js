// eslint-disable-next-line no-unused-vars
const { BaseInteraction } = require("discord.js");
/**
 * @param {BaseInteraction} interaction
 */
module.exports = async function (interaction) {
    if (!interaction.isModalSubmit()) return;
    for (const value of interaction.client.modals) {
        await value(interaction);
    }
}
