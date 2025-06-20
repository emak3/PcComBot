const { 
    ButtonInteraction, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');
const config = require('../../config.js');
const log = require('../../logger.js');

/**
 * 対話チャンネルのボタンハンドラー
 * @param {ButtonInteraction} interaction 
 */
module.exports = async function(interaction) {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    
    // 解決済みボタンの処理
    if (customId.startsWith('dialog_solved_')) {
        await handleSolvedButton(interaction);
    }
    // 対話終了ボタンの処理
    else if (customId.startsWith('dialog_close_')) {
        await handleCloseButton(interaction);
    }
};

/**
 * 解決済みボタンの処理
 * @param {ButtonInteraction} interaction 
 */
async function handleSolvedButton(interaction) {
    try {
        // 管理者権限の確認
        if (!hasPermission(interaction)) {
            return await interaction.reply({
                content: '❌ この操作を実行する権限がありません。',
                flags: MessageFlags.Ephemeral
            });
        }

        const inquiryId = interaction.customId.replace('dialog_solved_', '');
        const channel = interaction.channel;
        
        // チャンネル名を解決済みに変更
        const currentName = channel.name;
        let newName = currentName;
        if (!currentName.startsWith('solved-')) {
            newName = `solved-${currentName}`;
        }
        
        await channel.setName(newName);
        
        // 解決済み通知メッセージ（Components V2）
        const solvedContainer = new ContainerBuilder()
            .setAccentColor(0x00FF00) // 緑色
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents([
                        new TextDisplayBuilder()
                            .setContent('# ✅ 問い合わせが解決されました'),
                        new TextDisplayBuilder()
                            .setContent(`**解決者:** <@${interaction.user.id}>\n**解決日時:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                    ])
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
                    .setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`**問い合わせID:** \`${inquiryId}\`\n\nこのチャンネルは解決済みとしてマークされました。\n必要に応じて「対話終了」ボタンでチャンネルを閉じることができます。`)
            );

        // 解決済み通知を送信
        await interaction.reply({
            components: [solvedContainer],
            flags: MessageFlags.IsComponentsV2
        });

        // チャンネルを読み取り専用に設定（ユーザーの書き込み権限を削除）
        const userId = extractUserIdFromTopic(channel.topic);
        if (userId) {
            await channel.permissionOverwrites.edit(userId, {
                SendMessages: false
            });
        }

        // 元の問い合わせチャンネルに解決通知
        await notifyMainChannel(interaction.client, inquiryId, 'solved', interaction.user);
        
        log.info(`問い合わせが解決されました: InquiryID: ${inquiryId} - Channel: ${channel.name} - SolvedBy: ${interaction.user.username}`);

    } catch (error) {
        log.error('解決済み処理エラー:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ 解決済み処理中にエラーが発生しました。',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

/**
 * 対話終了ボタンの処理
 * @param {ButtonInteraction} interaction 
 */
async function handleCloseButton(interaction) {
    try {
        // 管理者権限の確認
        if (!hasPermission(interaction)) {
            return await interaction.reply({
                content: '❌ この操作を実行する権限がありません。',
                flags: MessageFlags.Ephemeral
            });
        }

        const inquiryId = interaction.customId.replace('dialog_close_', '');
        const channel = interaction.channel;
        
        // 終了通知メッセージ（Components V2）
        const closeContainer = new ContainerBuilder()
            .setAccentColor(0xFF0000) // 赤色
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents([
                        new TextDisplayBuilder()
                            .setContent('# 🔒 対話チャンネルを終了します'),
                        new TextDisplayBuilder()
                            .setContent(`**終了者:** <@${interaction.user.id}>\n**終了日時:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                    ])
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
                    .setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`**問い合わせID:** \`${inquiryId}\`\n\nこのチャンネルは10秒後に削除されます。`)
            );

        // 終了通知を送信
        await interaction.reply({
            components: [closeContainer],
            flags: MessageFlags.IsComponentsV2
        });

        // 元の問い合わせチャンネルに終了通知
        await notifyMainChannel(interaction.client, inquiryId, 'closed', interaction.user);
        
        log.info(`対話チャンネルが終了されました: InquiryID: ${inquiryId} - Channel: ${channel.name} - ClosedBy: ${interaction.user.username}`);

        // 10秒後にチャンネルを削除
        setTimeout(async () => {
            try {
                await channel.delete('対話終了による削除');
                log.info(`対話チャンネルが削除されました: InquiryID: ${inquiryId}`);
            } catch (deleteError) {
                log.error('チャンネル削除エラー:', deleteError);
            }
        }, 10000);

    } catch (error) {
        log.error('対話終了処理エラー:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ 対話終了処理中にエラーが発生しました。',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

/**
 * 権限チェック
 * @param {ButtonInteraction} interaction 
 * @returns {boolean}
 */
function hasPermission(interaction) {
    const member = interaction.member;
    if (!member) return false;
    
    // 管理者ロールまたはサポートロールを持っているかチェック
    return member.roles.cache.has(config.adminRoleId) || 
           member.roles.cache.has(config.supportRoleId) ||
           member.permissions.has(PermissionFlagsBits.ManageChannels);
}

/**
 * チャンネルトピックからユーザーIDを抽出
 * @param {string} topic 
 * @returns {string|null}
 */
function extractUserIdFromTopic(topic) {
    if (!topic) return null;
    // "問い合わせID: inquiry_timestamp_userId | カテゴリー: ..." の形式からuserIdを抽出
    const match = topic.match(/inquiry_\d+_(\d+)/);
    return match ? match[1] : null;
}

/**
 * メインの問い合わせチャンネルに通知
 * @param {Client} client 
 * @param {string} inquiryId 
 * @param {string} action 
 * @param {User} user 
 */
async function notifyMainChannel(client, inquiryId, action, user) {
    try {
        const inquiryChannel = client.channels.cache.get(config.inquiryChannelId);
        if (!inquiryChannel) return;

        let color, title, description;
        
        if (action === 'solved') {
            color = 0x00FF00;
            title = '✅ 問い合わせが解決されました';
            description = `**解決者:** <@${user.id}>`;
        } else if (action === 'closed') {
            color = 0xFF0000;
            title = '🔒 対話チャンネルが終了されました';
            description = `**終了者:** <@${user.id}>`;
        }

        const notificationContainer = new ContainerBuilder()
            .setAccentColor(color)
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`# ${title}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
                    .setDivider(false)
            )
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents([
                        new TextDisplayBuilder()
                            .setContent(`**問い合わせID:** \`${inquiryId}\``),
                        new TextDisplayBuilder()
                            .setContent(description),
                        new TextDisplayBuilder()
                            .setContent(`**日時:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                    ])
            );

        await inquiryChannel.send({
            components: [notificationContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        log.error('メインチャンネル通知エラー:', error);
    }
}