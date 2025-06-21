// eslint-disable-next-line no-unused-vars
const { ButtonInteraction, ContainerBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const log = require("../../logger.js");
const config = require("../../config.js");

/**
 * @param {ButtonInteraction} interaction
 */
module.exports = async function (interaction) {
    if (interaction.customId.startsWith("crch")) {
        const member = interaction.customId.split('_')[1];
        
    }
}