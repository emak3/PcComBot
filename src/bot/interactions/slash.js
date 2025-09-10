// eslint-disable-next-line no-unused-vars
const { BaseInteraction, MessageFlags } = require("discord.js");
/**
 * @param {BaseInteraction} interaction
 */
module.exports = async function (interaction) {
    if (!interaction.isCommand()) return;
    
    // インタラクションが既に応答済みかチェック
    if (interaction.replied || interaction.deferred) {
        return;
    }
    
    if (interaction.client.commands.has(interaction.commandName)) {
        try {
            await interaction.client.commands.get(interaction.commandName).execute(interaction);
        } catch (error) {
            console.error(`コマンド ${interaction.commandName} でエラーが発生しました:`, error);
            
            // インタラクションがまだ応答していない場合の処理
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({ 
                        content: "コマンドの実行中にエラーが発生しました。", 
                        flags: MessageFlags.Ephemeral 
                    });
                } catch (replyError) {
                    console.error("エラーレスポンス送信失敗:", replyError);
                }
            } else {
                try {
                    await interaction.editReply({ 
                        content: "コマンドの実行中にエラーが発生しました。" 
                    });
                } catch (editError) {
                    console.error("エラーレスポンス編集失敗:", editError);
                }
            }
        }
    } else {
        try {
            // await interaction.reply({ content: "コマンドが存在しない又は、エラーの可能性があります。", flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error("コマンド不存在レスポンス失敗:", error);
        }
    }
};
