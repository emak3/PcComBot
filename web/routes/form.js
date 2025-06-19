const express = require('express');
const multer = require('multer');
const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
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

        // 問い合わせ内容のEmbed作成
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📝 新しい問い合わせ')
            .setThumbnail(user.avatarURL)
            .addFields([
                { name: '📋 カテゴリー', value: categoryTitle, inline: true },
                { name: '👤 送信者', value: `${user.displayName}\n(<@${user.id}>)`, inline: true },
                { name: '💬 管理者との対話', value: wantDialog === 'on' ? '✅ 希望する' : '❌ 希望しない', inline: true },
                { name: '🕶️ 匿名希望', value: anonymous === 'on' ? '✅ 希望する' : '❌ 希望しない', inline: true },
                { name: '📄 内容', value: content }
            ])
            .setTimestamp()
            .setFooter({ text: `User ID: ${user.id}` });

        // 問い合わせチャンネルに送信
        const inquiryChannel = req.client.channels.cache.get(config.inquiryChannelId);
        if (!inquiryChannel) {
            throw new Error('問い合わせチャンネルが見つかりません');
        }

        const messageData = {
            embeds: [embed]
        };

        // 添付ファイルがある場合
        if (req.files && req.files.length > 0) {
            messageData.files = req.files.map(file => ({
                attachment: file.buffer,
                name: file.originalname
            }));
        }

        const sentMessage = await inquiryChannel.send(messageData);

        // 管理者との対話を希望する場合、専用チャンネル作成
        if (wantDialog === 'on') {
            await createDialogChannel(req.client, user, categoryTitle, content, req.files);
        }

        log.info(`問い合わせが送信されました: ${user.username} (${user.id}) - ${categoryTitle}`);
        
        res.json({ 
            success: true, 
            message: '問い合わせを送信しました。' + (wantDialog === 'on' ? ' 専用チャンネルを作成しました。' : '') 
        });

    } catch (error) {
        log.error('フォーム送信エラー:', error);
        res.status(500).json({ error: 'フォームの送信に失敗しました' });
    }
});

// 管理者との対話用チャンネル作成
async function createDialogChannel(client, user, categoryTitle, content, files) {
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
                }
            ]
        });

        // 初期メッセージ送信
        const initialEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('💬 管理者との対話チャンネル')
            .setDescription(`<@${user.id}> さんの問い合わせです。`)
            .addFields([
                { name: '📋 カテゴリー', value: categoryTitle },
                { name: '📄 初期内容', value: content }
            ])
            .setThumbnail(user.avatarURL)
            .setTimestamp();

        const messageData = {
            content: `<@${user.id}> <@&${config.adminRoleId}>`,
            embeds: [initialEmbed]
        };

        if (files && files.length > 0) {
            messageData.files = files.map(file => ({
                attachment: file.buffer,
                name: file.originalname
            }));
        }

        await channel.send(messageData);

        log.info(`対話チャンネルを作成しました: ${channel.name} (${channel.id})`);

    } catch (error) {
        log.error('対話チャンネル作成エラー:', error);
        throw error;
    }
}

module.exports = router;