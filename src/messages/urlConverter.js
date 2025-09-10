const { Message, ChannelType } = require("discord.js");
const getWebhookInChannel = require("../utils/webhookGet");
const log = require("../core/logger.js");
const config = require("../app/config.js");

/**
 * @param {Message} message
 */
module.exports = async function (message) {
    if (message.channel.type === ChannelType.GuildCategory || message.channel.isDMBased() || message.author.bot) return;
    
    // 特定のサーバーでのみ動作するように制限
    if (message.guild.id !== config.sanee) return;
    
    const content = message.content;
    let hasUrlToConvert = false;
    let convertedContent = content;

    // x.com → fxtwitter.com への変換
    if (content.includes('x.com/')) {
        convertedContent = convertedContent.replace(/https?:\/\/(www\.)?x\.com\//g, 'https://fxtwitter.com/');
        hasUrlToConvert = true;
    }

    // www.instagram.com → www.ddinstagram.com への変換  
    if (content.includes('www.instagram.com/')) {
        convertedContent = convertedContent.replace(/https?:\/\/www\.instagram\.com\//g, 'https://www.ddinstagram.com/');
        hasUrlToConvert = true;
    }

    // 変換するURLがない場合は何もしない
    if (!hasUrlToConvert) return;

    try {
        // メッセージを削除
        await message.delete();

        // Webhookを取得またはチャンネルに作成
        const webhook = await getWebhookInChannel(message.channel);
        
        // 変換されたURLでメッセージを送信
        await webhook.send({
            content: convertedContent,
            username: message.member?.nickname || message.author.globalName || message.author.username,
            avatarURL: message.member?.displayAvatarURL() || message.author.displayAvatarURL(),
            allowedMentions: { parse: ["users", "roles", "everyone"] },
            threadId: message.channel.isThread() ? message.channel.id : null
        });

    } catch (error) {
        log.error("URL変換処理でエラーが発生しました:", error);
    }
};