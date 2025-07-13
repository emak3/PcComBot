// eslint-disable-next-line no-unused-vars
const { ButtonInteraction } = require("discord.js");
const log = require("../../logger.js");
// const config = require("../../config.js");

/**
 * @param {ButtonInteraction} interaction
 */
module.exports = async function (interaction) {
    if (interaction.customId.startsWith("unlockch")) {
        const member = interaction.customId.split("_")[1];

        await interaction.channel.permissionOverwrites.edit(member, {
            SendMessages: true,
            ViewChannel: true,
            ReadMessageHistory: true
        });

        const disableAllButtons = (components) => {
            return components.map(container => {
                if (container.data.type === 17) {
                    const updatedSections = container.components.map(section => {
                        const sectionData = { ...section.data };

                        if (section.components && Array.isArray(section.components)) {
                            sectionData.components = section.components.map(comp => ({
                                type: comp.type,
                                id: comp.id,
                                content: comp.content
                            }));
                        }
                        if (section.accessory && section.accessory.data.type === 2) {
                            sectionData.accessory = {
                                ...section.accessory.data,
                                disabled: true
                            };
                        }

                        return sectionData;
                    });

                    return {
                        ...container.data,
                        components: updatedSections
                    };
                }

                return container.data;
            });
        };

        try {
            const updatedComponents = disableAllButtons(interaction.message.components);
            await interaction.message.edit({
                components: updatedComponents
            });
        } catch (error) {
            log.error("更新エラー:", error);
        }

        await interaction.reply({
            content: "🔓"
        });
    }
};
