// eslint-disable-next-line no-unused-vars
const { Events, BaseInteraction } = require("discord.js");
module.exports = {
    name: Events.InteractionCreate,
    /**
     * @param {BaseInteraction} interaction
     */
    async execute (interaction) {
        for (const value of interaction.client.interactions) {
            try {
                await value(interaction);
                // インタラクションが処理された場合は他のハンドラーを実行しない
                if (interaction.replied || interaction.deferred) {
                    break;
                }
            } catch (error) {
                console.error("インタラクションハンドラーエラー:", error);
            }
        }
    }
};
