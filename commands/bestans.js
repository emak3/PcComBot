// eslint-disable-next-line no-unused-vars
const { ChatInputCommandInteraction, ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder, MessageFlags } = require("discord.js");
const config = require("../config.js");
module.exports = {
    command: new ContextMenuCommandBuilder()
        .setName("BestAnswer")
        .setNameLocalization("ja", "BestAnswer")
        .setType(ApplicationCommandType.Message)
        .setDMPermission(false),
    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute (interaction) {
        if (interaction.channel.parentId === config.questionChId) {
            const thread = interaction.channel;
            if (interaction.user.id !== thread.ownerId) return await interaction.reply({ content: "投稿者以外使用できません。", flags: MessageFlags.Ephemeral });
            const answerEmbed = new EmbedBuilder()
                .setColor("#55b87d")
                .setDescription("### ✅ 質問が解決しました\nこの質問は解決済みです。 `@ 回答者` 質問への回答ありがとうございました。\n" + `[ 回答 ](https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${interaction.targetId})`);
            await interaction.reply({ embeds: [answerEmbed] });
            const tags = thread.appliedTags;
            tags.push(config.kaiketsuTag);
            await thread.setAppliedTags(tags);
            await thread.setArchived(true);
        } else {
            await interaction.reply({ content: "ここでは使用できません。", flags: MessageFlags.Ephemeral });
        }
    }
};
