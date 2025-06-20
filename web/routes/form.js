const express = require('express');
const multer = require('multer');
const { 
    ChannelType, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');
const config = require('../../config.js');
const log = require('../../logger.js');
const { requireAuth } = require('../middleware/auth.js');

const router = express.Router();

// ファイルアップロード設定
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 1024 * 1024, // 1MB
        files: 5 // 最大5ファイル
    },
    fileFilter: (req, file, cb) => {
        // 基本的なファイルタイプ制限
        const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|doc|docx|zip|rar/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('許可されていないファイル形式です'));
        }
    }
});

// Components V2を使用した問い合わせメッセージの作成
function createInquiryCV2Message(user, categoryTitle, content, inquiryId, isUrgent, anonymous, wantDialog, files) {
    const container = new ContainerBuilder();

    // 緊急度に応じたアクセントカラー設定
    if (isUrgent) {
        container.setAccentColor(0xFF0000); // 赤色
    } else {
        container.setAccentColor(0x5865F2); // Discord Blue
    }

    // ヘッダーセクション
    const headerSection = new SectionBuilder()
        .addTextDisplayComponents([
            new TextDisplayBuilder()
                .setContent('# 📝 新しい問い合わせ'),
            new TextDisplayBuilder()
                .setContent(`**問い合わせID:** \`${inquiryId}\`\n**緊急度:** ${isUrgent ? '🚨 高' : '📝 通常'}`)
        ]);

    // ユーザーアバターをサムネイルとして追加
    if (user.avatarURL) {
        headerSection.setThumbnailAccessory(
            new ThumbnailBuilder()
                .setURL(user.avatarURL)
                .setDescription(`${user.displayName || user.username}のアバター`)
        );
    }

    container.addSectionComponents(headerSection);

    // 区切り線
    container.addSeparatorComponents(
        new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Large)
            .setDivider(true)
    );

    // 詳細情報セクション
    container.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents([
                new TextDisplayBuilder()
                    .setContent(`## 📋 問い合わせ詳細\n**カテゴリー:** ${categoryTitle}`),
                new TextDisplayBuilder()
                    .setContent(`**送信者:** ${anonymous ? '🕶️ 匿名ユーザー' : `${user.displayName}\n<@${user.id}>`}`),
                new TextDisplayBuilder()
                    .setContent(`**管理者との対話:** ${wantDialog ? '✅ 希望する' : '❌ 希望しない'}`)
            ])
    );

    // 区切り線
    container.addSeparatorComponents(
        new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(true)
    );

    // 内容表示
    container.addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent(`## 📄 問い合わせ内容\n${content}`)
    );

    // ファイル添付がある場合
    if (files && files.length > 0) {
        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        const fileInfo = files.map(file => `📎 **${file.originalname}** (${(file.size / 1024).toFixed(1)}KB)`).join('\n');
        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`## 📁 添付ファイル\n${fileInfo}`)
        );
    }

    // フッター区切り線
    container.addSeparatorComponents(
        new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Large)
            .setDivider(true)
    );

    // フッター情報
    const footerText = `**作成日時:** <t:${Math.floor(Date.now() / 1000)}:F>\n**User ID:** \`${user.id}\``;
    container.addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent(footerText)
    );

    return container;
}

// フォーム送信処理
router.post('/submit', requireAuth, upload.array('attachments', 5), async (req, res) => {
    try {
        const { category, customTitle, wantDialog, anonymous, content } = req.body;
        const user = req.session.user;

        // バリデーション
        if (!category || !content) {
            return res.status(400).json({ error: 'カテゴリーと内容は必須です' });
        }

        if (content.length > 800) {
            return res.status(400).json({ error: '内容は800文字以内で入力してください' });
        }

        // カテゴリーのタイトル設定
        let categoryTitle = category;
        if (category === 'その他' && customTitle) {
            categoryTitle = `その他: ${customTitle}`;
        }

        // ユニークなお問い合わせIDを生成
        const inquiryId = `inquiry_${Date.now()}_${user.id}`;

        // 緊急度の判定
        const isUrgent = ['違反報告', 'バグ報告'].includes(category);

        // Components V2メッセージの作成
        const cv2Container = createInquiryCV2Message(
            user, 
            categoryTitle, 
            content, 
            inquiryId, 
            isUrgent, 
            anonymous === 'on', 
            wantDialog === 'on', 
            req.files
        );

        // 基本的なアクションボタンのみ（対話チャンネル作成ボタンを条件付きで追加）
        const actionButtons = [];
        
        if (wantDialog === 'on') {
            actionButtons.push(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`inquiry_create_channel_${inquiryId}`)
                            .setLabel('対話チャンネル作成')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('💬')
                    )
            );
        }

        // 問い合わせチャンネルに送信
        const inquiryChannel = req.client.channels.cache.get(config.inquiryChannelId);
        if (!inquiryChannel) {
            throw new Error('問い合わせチャンネルが見つかりません');
        }

        const messageData = {
            components: [cv2Container, ...actionButtons],
            flags: MessageFlags.IsComponentsV2
        };

        // 添付ファイルがある場合
        if (req.files && req.files.length > 0) {
            messageData.files = req.files.map(file => ({
                attachment: file.buffer,
                name: file.originalname
            }));
        }

        const sentMessage = await inquiryChannel.send(messageData);

        // メッセージIDを含む情報をログに記録
        log.info(`問い合わせが送信されました: ${user.username} (${user.id}) - ${categoryTitle} - MessageID: ${sentMessage.id} - InquiryID: ${inquiryId}`);

        // 管理者との対話を希望する場合は即座にチャンネル作成
        if (wantDialog === 'on') {
            await createDialogChannel(req.client, user, categoryTitle, content, req.files, inquiryId);
        }
        
        res.json({ 
            success: true, 
            message: '問い合わせを送信しました。' + (wantDialog === 'on' ? ' 専用チャンネルを作成しました。' : ''),
            inquiryId: inquiryId
        });

    } catch (error) {
        log.error('フォーム送信エラー:', error);
        res.status(500).json({ error: 'フォームの送信に失敗しました' });
    }
});

// 管理者との対話用チャンネル作成（CV2対応版）
async function createDialogChannel(client, user, categoryTitle, content, files, inquiryId) {
    try {
        const guild = client.guilds.cache.get(config.pccomId);
        const category = guild.channels.cache.get(config.inquiryCategoryId);

        // チャンネル名生成（ユニーク性確保）
        const channelName = `問い合わせ-${user.username}-${Date.now()}`.toLowerCase()
            .replace(/[^a-z0-9\-]/g, '-')
            .substring(0, 100);

        // チャンネル作成
        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category,
            topic: `問い合わせID: ${inquiryId} | カテゴリー: ${categoryTitle}`,
            permissionOverwrites: [
                {
                    id: guild.id, // @everyone
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id, // 送信者
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },
                {
                    id: config.adminRoleId, // 管理者
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageMessages
                    ]
                },
                {
                    id: config.supportRoleId, // サポート
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageMessages
                    ]
                }
            ]
        });

        // 対話チャンネル用CV2メッセージの作成
        const dialogContainer = new ContainerBuilder()
            .setAccentColor(0x5865F2)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents([
                        new TextDisplayBuilder()
                            .setContent('# 💬 管理者との対話チャンネル'),
                        new TextDisplayBuilder()
                            .setContent(`<@${user.id}> さんの問い合わせです。`)
                    ])
                    .setThumbnailAccessory(
                        new ThumbnailBuilder()
                            .setURL(user.avatarURL)
                            .setDescription(`${user.displayName}のアバター`)
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Large)
                    .setDivider(true)
            )
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents([
                        new TextDisplayBuilder()
                            .setContent(`**🆔 問い合わせID:** \`${inquiryId}\``),
                        new TextDisplayBuilder()
                            .setContent(`**📋 カテゴリー:** ${categoryTitle}`),
                        new TextDisplayBuilder()
                            .setContent(`**🕐 作成日時:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                    ])
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
                    .setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`## 📄 初期内容\n${content}`)
            );

        // 対話チャンネル用のアクションボタン（対話終了と解決済みのみ）
        const dialogActionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`dialog_solved_${inquiryId}`)
                    .setLabel('解決済み')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`dialog_close_${inquiryId}`)
                    .setLabel('対話終了')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

        const messageData = {
            content: `<@${user.id}> <@&${config.adminRoleId}> <@&${config.supportRoleId}>`,
            components: [dialogContainer, dialogActionRow],
            flags: MessageFlags.IsComponentsV2
        };

        if (files && files.length > 0) {
            messageData.files = files.map(file => ({
                attachment: file.buffer,
                name: file.originalname
            }));
        }

        await channel.send(messageData);

        // チャンネル作成通知（CV2版）
        const notificationContainer = new ContainerBuilder()
            .setAccentColor(0x00FF00)
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`# ✅ 対話チャンネルが作成されました\nチャンネル: <#${channel.id}>`)
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
                            .setContent(`**チャンネルID:** \`${channel.id}\``)
                    ])
            );

        // 元の問い合わせチャンネルに通知
        const inquiryChannel = client.channels.cache.get(config.inquiryChannelId);
        if (inquiryChannel) {
            await inquiryChannel.send({
                components: [notificationContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        log.info(`対話チャンネルを作成しました: ${channel.name} (${channel.id}) - InquiryID: ${inquiryId}`);

    } catch (error) {
        log.error('対話チャンネル作成エラー:', error);
        throw error;
    }
}

module.exports = router;