
const {
    Message,
    AttachmentBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    FileBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChannelType,
    UserSelectMenuBuilder
} = require("discord.js");
const config = require("../app/config.js");
/**
 * @param {Message} message
 */
module.exports = async function (message) {
    if (message.content === "!a") {
        if (message.author.bot) return;
        const discordUser = await message.client.users.fetch("864735082732322867");
        const mainContainer =
            new ContainerBuilder()
                .addSectionComponents(
                    section => section
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent("## 💬 管理者との対話チャンネル"),
                            textDisplay => textDisplay
                                .setContent(`<@${discordUser.id}> さんの問い合わせ`),
                            textDisplay => textDisplay
                                .setContent("\n対話希望に ✅ が入っていたため、チャンネルを作成しました。")
                        )
                        .setThumbnailAccessory(
                            thumbnail => thumbnail
                                .setURL(discordUser.displayAvatarURL())
                        )
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent("### 📋 カテゴリー"),
                    textDisplay => textDisplay
                        .setContent("かてごりーのたいとる")
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent("### 📄 内容"),
                    textDisplay => textDisplay
                        .setContent("そうしんされたないよう")
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addSectionComponents(
                    section => section
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent("-# 問題が解決したら右の [対話終了] ボタンを押してください。")
                        )
                        .setButtonAccessory(
                            button => button
                                .setCustomId(`lockch_${discordUser.id}`)
                                .setLabel("🔒 対話終了")
                                .setStyle(ButtonStyle.Primary)
                        )
                );

        // メッセージデータの基本構造
        const messageData = {
            components: [mainContainer],
            flags: MessageFlags.IsComponentsV2
        };
        await message.channel.send(messageData);
    }
};
