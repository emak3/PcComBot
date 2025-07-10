const express = require('express');
const multer = require('multer');
const {
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
    PermissionFlagsBits,
} = require('discord.js');
const config = require('../../config.js');
const log = require('../../logger.js');
const { requireAuth } = require('../middleware/auth.js');

const router = express.Router();

// ファイル名を安全にする関数
function sanitizeFileName(filename) {
    // スペースをハイフンに置き換え、その他の問題のある文字も処理
    return filename
        .replace(/\s+/g, '-')  // スペース（複数の連続も含む）をハイフンに
        .replace(/[<>:"/\\|?*]/g, '-')  // ファイル名に使えない文字をハイフンに
        .replace(/-+/g, '-')  // 連続するハイフンを単一に
        .replace(/^-+|-+$/g, '');  // 先頭・末尾のハイフンを削除
}

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

function isImageFile(file) {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

    return imageTypes.includes(file.mimetype) ||
        imageExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext));
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

        const discordUser = await req.client.users.fetch(user.id);

        const inquiryContainer = new ContainerBuilder()
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## 📝 新しい問い合わせ'),
                        textDisplay => textDisplay
                            .setContent('**👤 送信者**'),
                        textDisplay => textDisplay
                            .setContent(`${discordUser.displayName}  (<@${discordUser.id}>)`)
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
                    .setContent(`💬 **管理者との対話**：  ${wantDialog === 'on' ? '✅ 希望する' : '❌ 希望しない'}`),
                textDisplay => textDisplay
                    .setContent(`🕶️ **匿名希望　　　**：  ${anonymous === 'on' ? '✅ 希望する' : '❌ 希望しない'}`)
            )
            .addSeparatorComponents(
                separator => separator
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`### 📋 カテゴリー ${categoryTitle}`),
                textDisplay => textDisplay
                    .setContent(categoryTitle)
            )
            .addSeparatorComponents(
                separator => separator
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('### 📄 内容'),
                textDisplay => textDisplay
                    .setContent(content)
            );

        // 添付ファイルがある場合の処理
        const fileAttachments = [];
        if (req.files && req.files.length > 0) {
            // ファイルアタッチメントを作成（ファイル名を安全にする）
            req.files.forEach(file => {
                const safeFileName = sanitizeFileName(file.originalname);
                log.debug(`ファイル名を変更: "${file.originalname}" → "${safeFileName}"`);

                fileAttachments.push(
                    new AttachmentBuilder()
                        .setFile(file.buffer)
                        .setName(safeFileName)
                );

                // 元のファイル名も安全なものに更新（後続処理用）
                file.originalname = safeFileName;
            });

            // 画像ファイルと非画像ファイルを分ける
            const imageFiles = req.files.filter(file => isImageFile(file));
            const nonImageFiles = req.files.filter(file => !isImageFile(file));

            // セパレーターを追加
            inquiryContainer.addSeparatorComponents(
                separator => separator
            );

            // 画像ファイルがある場合、Media Galleryを追加
            if (imageFiles.length > 0) {
                const mediaGalleryBuilder = new MediaGalleryBuilder();
                inquiryContainer.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('### 🖼️ 添付画像')
                );
                imageFiles.forEach(file => {
                    mediaGalleryBuilder.addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(`attachment://${file.originalname}`)
                    );
                });

                inquiryContainer.addMediaGalleryComponents(mediaGalleryBuilder);
            }

            // 非画像ファイルがある場合、Fileコンポーネントを追加
            if (nonImageFiles.length > 0) {
                // 画像がある場合はセパレーターを追加
                if (imageFiles.length > 0) {
                    inquiryContainer.addSeparatorComponents(
                        separator => separator
                    );
                }

                // 添付ファイルセクションのタイトル
                inquiryContainer.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('### 📎 添付ファイル')
                );

                // 各非画像ファイルをFileコンポーネントとして追加
                nonImageFiles.forEach(file => {
                    inquiryContainer.addFileComponents(
                        fileBuilder => fileBuilder
                            .setURL(`attachment://${file.originalname}`)
                    );
                });
            }
        }

        let disable = true
        if (anonymous === 'on') {
            disable = true
        } else {
            if (wantDialog === 'on') {
                disable = true
            } else {
                disable = false
            }
        }

        // セパレーターとボタンセクションを追加
        inquiryContainer
            .addSeparatorComponents(
                separator => separator
            )
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`-# 送信日時: <t:${Math.floor(Date.now() / 1000)}:F>\nUser ID: ${user.id}`)
                    )
                    .setButtonAccessory(
                        button => button
                            .setCustomId(`crch_${user.id}`)
                            .setLabel('🔏 対話チャンネルを作成')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(disable)
                    )
            );

        // 問い合わせチャンネルに送信
        const inquiryChannel = req.client.channels.cache.get(config.inquiryChannelId);
        if (!inquiryChannel) {
            throw new Error('問い合わせチャンネルが見つかりません');
        }

        const messageData = {
            components: [inquiryContainer],
            files: fileAttachments,
            flags: MessageFlags.IsComponentsV2
        };

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
                },
                {
                    id: config.supportRoleId, // 管理者
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
        const discordUser = await client.users.fetch(user.id);

        const mainContainer =
            new ContainerBuilder()
                .addSectionComponents(
                    section => section
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('## 💬 管理者との対話チャンネル'),
                            textDisplay => textDisplay
                                .setContent(`<@${discordUser.id}> さんの問い合わせ`),
                            textDisplay => textDisplay
                                .setContent(`\n対話希望に ✅ が入っていたため、チャンネルを作成しました。`),
                        )
                        .setThumbnailAccessory(
                            thumbnail => thumbnail
                                .setURL(discordUser.displayAvatarURL()),
                        )
                )
                .addSeparatorComponents(
                    separator => separator,
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('### 📋 カテゴリー'),
                    textDisplay => textDisplay
                        .setContent(categoryTitle),
                )
                .addSeparatorComponents(
                    separator => separator,
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('### 📄 内容'),
                    textDisplay => textDisplay
                        .setContent(content),
                )
                .addSeparatorComponents(
                    separator => separator,
                );

        // メッセージデータの基本構造
        const messageData = {
            components: [mainContainer],
            files: [],
            flags: MessageFlags.IsComponentsV2
        };

        // ファイルがある場合、Media Galleryを追加
        if (files && files.length > 0) {
            const fileAttachments = files.map(file => {
                const safeFileName = sanitizeFileName(file.originalname);
                return new AttachmentBuilder()
                    .setFile(file.buffer)
                    .setName(safeFileName);
            });

            // 画像ファイルと非画像ファイルを分ける
            const imageFiles = files.filter(file => isImageFile(file));
            const nonImageFiles = files.filter(file => !isImageFile(file));

            // 画像ファイルがある場合、Media Galleryを追加
            if (imageFiles.length > 0) {
                const mediaGalleryBuilder = new MediaGalleryBuilder();
                mainContainer.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('### 🖼️ 添付画像')
                );

                imageFiles.forEach(file => {
                    const safeFileName = sanitizeFileName(file.originalname);
                    mediaGalleryBuilder.addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(`attachment://${safeFileName}`)
                    );
                });

                mainContainer.addMediaGalleryComponents(mediaGalleryBuilder);
            }

            // 非画像ファイルがある場合、Fileコンポーネントを追加
            if (nonImageFiles.length > 0) {
                // セパレーターを追加（画像がある場合のみ）
                if (imageFiles.length > 0) {
                    mainContainer.addSeparatorComponents(
                        separator => separator
                    );
                }

                // 添付ファイルセクションのタイトル
                mainContainer.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('### 📎 添付ファイル')
                );

                // 各非画像ファイルをFileコンポーネントとして追加
                nonImageFiles.forEach(file => {
                    const safeFileName = sanitizeFileName(file.originalname);
                    mainContainer.addFileComponents(
                        fileBuilder => fileBuilder
                            .setURL(`attachment://${safeFileName}`)
                    );
                });
            }

            messageData.files.push(...fileAttachments);
        }

        mainContainer
            .addSeparatorComponents(
                separator => separator
            )
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`-# 送信日時: <t:${Math.floor(Date.now() / 1000)}:F>\n-# 問題が解決したら右の [対話終了] ボタンを押してください。`),
                    )
                    .setButtonAccessory(
                        button => button
                            .setCustomId(`lockch_${discordUser.id}`)
                            .setLabel('🔒 対話終了')
                            .setStyle(ButtonStyle.Primary)
                    ),
            );

        // メッセージを送信
        await channel.send(messageData);

        log.info(`対話チャンネルを作成しました: ${channel.name} (${channel.id})`);

    } catch (error) {
        log.error('対話チャンネル作成エラー:', error);
        throw error;
    }
}

module.exports = router;