// eslint-disable-next-line no-unused-vars
const { BaseInteraction } = require("discord.js");
/**
 * @param {BaseInteraction} interaction
 */
module.exports = async function (interaction) {
    if (!interaction.isStringSelectMenu()) return;
    for (const value of interaction.client.menus) {
        // 関数であることを確認してから実行
        if (typeof value === "function") {
            await value(interaction);
        }
    }
};
