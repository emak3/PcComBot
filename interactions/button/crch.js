
const {
    ButtonInteraction,
    ContainerBuilder,
    ButtonStyle,
    MessageFlags,
    ChannelType,
    PermissionFlagsBits,
    AttachmentBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require("discord.js");
const log = require("../../logger.js");
const config = require("../../config.js");
const axios = require("axios");

// ファイル名を安全にする関数
function sanitizeFileName (filename) {
    // スペースをハイフンに置き換え、その他の問題のある文字も処理
    return filename
        .replace(/\s+/g, "-")  // スペース（複数の連続も含む）をハイフンに
        .replace(/[<>:"/\\|?*]/g, "-")  // ファイル名に使えない文字をハイフンに
        .replace(/-+/g, "-")  // 連続するハイフンを単一に
        .replace(/^-+|-+$/g, "");  // 先頭・末尾のハイフンを削除
}

/**
 * @param {ButtonInteraction} interaction
 */
module.exports = async function (interaction) {
    if (interaction.customId.startsWith("crch")) {
        const member = interaction.customId.split("_")[1];

        try {
            // ボタンを無効化して処理中を示す
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // 元のメッセージから情報を抽出
            const originalMessage = interaction.message;
            const messageInfo = extractMessageInfo(originalMessage);

            log.debug("抽出されたメッセージ情報:", messageInfo);

            if (!messageInfo) {
                await interaction.editReply({
                    content: "メッセージの情報を取得できませんでした。"
                });
                return;
            }

            // 対話チャンネルを作成
            const channel = await createDialogChannel(interaction.client, member, messageInfo);

            if (channel) {
                // 元のメッセージのボタンを無効化
                await disableButton(interaction);

                await interaction.editReply({
                    content: `対話チャンネル <#${channel.id}> を作成しました。`
                });

                log.info(`対話チャンネルを作成しました: ${channel.name} (${channel.id})`);
            } else {
                await interaction.editReply({
                    content: "対話チャンネルの作成に失敗しました。"
                });
            }

        } catch (error) {
            log.error("対話チャンネル作成エラー:", error);

            try {
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: "対話チャンネルの作成中にエラーが発生しました。管理者にお問い合わせください。"
                    });
                } else {
                    await interaction.reply({
                        content: "対話チャンネルの作成中にエラーが発生しました。管理者にお問い合わせください。",
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (replyError) {
                log.error("エラーレスポンス送信失敗:", replyError);
            }
        }
    }
};

/**
 * メッセージから必要な情報を抽出
 */
function extractMessageInfo (message) {
    try {
        log.debug("メッセージ内容:", JSON.stringify(message.content, null, 2));
        log.debug("メッセージコンポーネント:", JSON.stringify(message.components, null, 2));

        // メッセージ内容から直接情報を抽出
        let categoryInfo = null;
        let contentInfo = null;
        const mediaGalleryItems = [];
        const fileComponents = [];

        // より確実に生のJSONデータを取得
        const rawComponents = JSON.parse(JSON.stringify(message.components));
        log.debug("完全な生のJSONコンポーネント:", JSON.stringify(rawComponents, null, 2));

        function extractFromPureJSON (components) {
            const textDisplays = [];

            function traverse (obj) {
                if (Array.isArray(obj)) {
                    obj.forEach(traverse);
                } else if (obj && typeof obj === "object") {
                    // type: 10 がTextDisplayコンポーネント
                    if (obj.type === 10 && obj.content) {
                        textDisplays.push(obj.content);
                    }
                    // type: 12 がMediaGalleryコンポーネント
                    else if (obj.type === 12 && obj.items && Array.isArray(obj.items)) {
                        // 完全な生のJSONのitemsを使用
                        mediaGalleryItems.push(...obj.items);
                        log.debug("Pure JSON MediaGallery items found:", obj.items.length, obj.items);
                    }
                    // type: 13 がFileコンポーネント
                    else if (obj.type === 13 && obj.file) {
                        // 完全な生のJSONの値を使用
                        const fileInfo = {
                            url: obj.file.url,
                            size: obj.size || 0,
                            contentType: obj.file.content_type || "application/octet-stream",
                            attachmentId: obj.file.attachment_id
                        };
                        fileComponents.push(fileInfo);
                        log.debug("Pure JSON File component found:", fileInfo);
                    }
                    Object.values(obj).forEach(traverse);
                }
            }

            traverse(components);
            return textDisplays;
        }

        const allTexts = extractFromPureJSON(rawComponents);

        /*
                log.debug('抽出されたテキスト:', allTexts);
                log.debug('抽出されたMediaGallery:', mediaGalleryItems);
                log.debug('抽出されたFileComponents:', fileComponents);
        */

        // カテゴリーと内容を検索
        for (let i = 0; i < allTexts.length; i++) {
            const text = allTexts[i];

            if (text.includes("### 📋 カテゴリー")) {
                // 次のテキストがカテゴリー名
                if (i + 1 < allTexts.length) {
                    categoryInfo = allTexts[i + 1];
                }
            } else if (text.includes("### 📄 内容")) {
                // 次のテキストが内容
                if (i + 1 < allTexts.length) {
                    contentInfo = allTexts[i + 1];
                }
            }
        }

        log.debug("抽出された情報:", { categoryInfo, contentInfo });

        return {
            categoryInfo,
            contentInfo,
            attachments: message.attachments, // 通常の添付ファイル
            mediaGalleryItems, // コンポーネント内の画像（完全な生のJSONから）
            fileComponents // コンポーネント内のファイル（完全な生のJSONから）
        };

    } catch (error) {
        log.error("メッセージ情報抽出エラー:", error);
        return null;
    }
}

/**
 * 対話チャンネル作成
 */
async function createDialogChannel (client, userId, messageInfo) {
    try {
        const guild = client.guilds.cache.get(config.pccomId);
        const category = guild.channels.cache.get(config.inquiryCategoryId);
        const user = await client.users.fetch(userId);

        // チャンネル名生成
        const channelName = `問い合わせ-${user.username}-${Date.now()}`.toLowerCase()
            .replace(/[^a-z0-9\-]/g, "-")
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

        // 対話チャンネル用のメッセージを作成・送信
        await sendDialogMessage(channel, user, messageInfo);

        return channel;

    } catch (error) {
        log.error("対話チャンネル作成エラー:", error);
        throw error;
    }
}

/**
 * 対話チャンネルにメッセージを送信
 */
async function sendDialogMessage (channel, user, messageInfo) {
    try {
        const mainContainer = new ContainerBuilder()
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent("## 💬 管理者との対話チャンネル"),
                        textDisplay => textDisplay
                            .setContent(`<@${user.id}> さんの問い合わせ`),
                        textDisplay => textDisplay
                            .setContent("\n管理者が対話が必要と判断したため、チャンネルを作成しました。")
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(
                separator => separator
            );

        // カテゴリー情報を追加
        if (messageInfo.categoryInfo) {
            mainContainer
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent("### 📋 カテゴリー"),
                    textDisplay => textDisplay
                        .setContent(messageInfo.categoryInfo)
                )
                .addSeparatorComponents(
                    separator => separator
                );
        }

        // 内容を追加
        if (messageInfo.contentInfo) {
            mainContainer
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent("### 📄 内容"),
                    textDisplay => textDisplay
                        .setContent(messageInfo.contentInfo)
                )
                .addSeparatorComponents(
                    separator => separator
                );
        }

        // 添付ファイルの処理
        const fileAttachments = [];
        let hasImages = false;
        let hasFiles = false;

        // 画像ファイルの処理（一時ダウンロード）
        if (messageInfo.mediaGalleryItems && messageInfo.mediaGalleryItems.length > 0) {
            log.debug("MediaGalleryアイテムを処理中:", messageInfo.mediaGalleryItems.length);

            for (let i = 0; i < messageInfo.mediaGalleryItems.length; i++) {
                const item = messageInfo.mediaGalleryItems[i];

                try {
                    if (!item || !item.media || !item.media.url) {
                        log.warn(`MediaGalleryアイテム${i}: URLが見つかりません`);
                        continue;
                    }

                    const imageUrl = item.media.url;

                    // URLからファイル名を抽出し、安全にする
                    const urlParts = imageUrl.split("/");
                    const originalFilename = urlParts[urlParts.length - 1].split("?")[0] || `image_${i}.png`;
                    const filename = sanitizeFileName(originalFilename);

                    log.debug(`画像${i}ダウンロード中:`, { originalFilename, filename, url: imageUrl.substring(0, 100) + "..." });

                    // ファイルを一時的にダウンロード
                    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
                    const buffer = Buffer.from(response.data);

                    const attachmentBuilder = new AttachmentBuilder()
                        .setFile(buffer)
                        .setName(filename);

                    fileAttachments.push(attachmentBuilder);
                    hasImages = true;

                    log.debug(`画像${i}処理完了:`, filename);

                } catch (error) {
                    log.error(`MediaGalleryアイテム${i}処理エラー:`, error.message);
                }
            }
        }

        // 非画像ファイルの処理（一時ダウンロード）
        if (messageInfo.fileComponents && messageInfo.fileComponents.length > 0) {
            log.debug("Fileコンポーネントを処理中:", messageInfo.fileComponents.length);

            for (let i = 0; i < messageInfo.fileComponents.length; i++) {
                const fileComp = messageInfo.fileComponents[i];

                try {
                    if (!fileComp || !fileComp.url) {
                        log.warn(`Fileコンポーネント${i}: URLが見つかりません`);
                        continue;
                    }

                    const fileUrl = fileComp.url;

                    // URLからファイル名を抽出し、安全にする
                    const urlParts = fileUrl.split("/");
                    const originalFilename = urlParts[urlParts.length - 1].split("?")[0] || `file_${i}`;
                    const filename = sanitizeFileName(originalFilename);

                    log.debug(`ファイル${i}ダウンロード中:`, { originalFilename, filename, url: fileUrl.substring(0, 100) + "..." });

                    // ファイルを一時的にダウンロード
                    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
                    const buffer = Buffer.from(response.data);

                    const attachmentBuilder = new AttachmentBuilder()
                        .setFile(buffer)
                        .setName(filename);

                    fileAttachments.push(attachmentBuilder);
                    hasFiles = true;

                    log.debug(`ファイル${i}処理完了:`, filename);

                } catch (error) {
                    log.error(`Fileコンポーネント${i}処理エラー:`, error.message);
                }
            }
        }

        // 添付ファイルがある場合、コンポーネントに追加
        if (fileAttachments.length > 0) {
            log.debug("添付ファイル追加中:", fileAttachments.length);

            // 画像がある場合、Media Galleryを追加
            if (hasImages) {
                const mediaGalleryBuilder = new MediaGalleryBuilder();
                mainContainer.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent("### 🖼️ 添付画像")
                );

                fileAttachments.forEach(file => {
                    if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                        mediaGalleryBuilder.addItems(
                            new MediaGalleryItemBuilder()
                                .setURL(`attachment://${file.name}`)
                        );
                    }
                });

                mainContainer.addMediaGalleryComponents(mediaGalleryBuilder);
            }

            // 非画像ファイルがある場合、Fileコンポーネントを追加
            if (hasFiles) {
                if (hasImages) {
                    mainContainer.addSeparatorComponents(
                        separator => separator
                    );
                }

                mainContainer.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent("### 📎 添付ファイル")
                );

                fileAttachments.forEach(file => {
                    if (!file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                        mainContainer.addFileComponents(
                            fileBuilder => fileBuilder
                                .setURL(`attachment://${file.name}`)
                        );
                    }
                });
            }

            mainContainer.addSeparatorComponents(
                separator => separator
            );
        }

        // 対話終了ボタンを追加
        mainContainer.addSectionComponents(
            section => section
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`-# 送信日時: <t:${Math.floor(Date.now() / 1000)}:F>\n-# 問題が解決したら右の [対話終了] ボタンを押してください。`)
                )
                .setButtonAccessory(
                    button => button
                        .setCustomId(`lockch_${user.id}`)
                        .setLabel("🔒 対話終了")
                        .setStyle(ButtonStyle.Primary)
                )
        );

        // メッセージを送信
        const messageData = {
            components: [mainContainer],
            files: fileAttachments,
            flags: MessageFlags.IsComponentsV2
        };

        log.debug("送信するメッセージデータ:", {
            componentCount: messageData.components.length,
            fileCount: fileAttachments.length,
            fileNames: fileAttachments.map(f => f.name)
        });

        await channel.send(messageData);

    } catch (error) {
        log.error("対話メッセージ送信エラー:", error);
        throw error;
    }
}

/**
 * ボタンを無効化
 */
async function disableButton (interaction) {
    try {

        const originalMessage = interaction.message;
        log.debug("元のメッセージコンポーネント数:", originalMessage.components.length);

        const rawComponents = JSON.parse(JSON.stringify(originalMessage.components));
        log.debug("生のコンポーネントデータ取得完了");

        const fileAttachments = [];
        const fileUrlMap = new Map();

        // Fileコンポーネントを探してファイルをダウンロード
        for (const component of rawComponents) {
            if (component.type === 17 && component.components) { // Container
                for (const section of component.components) {
                    if (section.type === 13 && section.file && section.file.url) { // File component
                        try {
                            const fileUrl = section.file.url;
                            log.debug("ファイルダウンロード開始:", fileUrl);

                            // attachment://形式の場合は元の添付ファイルから取得
                            if (fileUrl.startsWith("attachment://")) {
                                const filename = fileUrl.replace("attachment://", "");
                                const originalAttachment = originalMessage.attachments.find(att => att.name === filename);

                                if (originalAttachment) {
                                    // 元の添付ファイルをダウンロード
                                    const response = await axios.get(originalAttachment.url, { responseType: "arraybuffer" });
                                    const buffer = Buffer.from(response.data);

                                    // ファイル名を安全にする
                                    const safeFilename = sanitizeFileName(filename);

                                    const attachmentBuilder = new AttachmentBuilder()
                                        .setFile(buffer)
                                        .setName(safeFilename);

                                    fileAttachments.push(attachmentBuilder);
                                    fileUrlMap.set(fileUrl, safeFilename);

                                    log.debug("ファイル再取得完了:", filename, "→", safeFilename);
                                }
                            } else {
                                // 外部URLの場合は直接ダウンロード
                                const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
                                const buffer = Buffer.from(response.data);

                                // URLからファイル名を抽出し、安全にする
                                const urlParts = fileUrl.split("/");
                                const originalFilename = urlParts[urlParts.length - 1].split("?")[0] || "file";
                                const filename = sanitizeFileName(originalFilename);

                                const attachmentBuilder = new AttachmentBuilder()
                                    .setFile(buffer)
                                    .setName(filename);

                                fileAttachments.push(attachmentBuilder);
                                fileUrlMap.set(fileUrl, filename);

                                log.debug("ファイルダウンロード完了:", originalFilename, "→", filename);
                            }
                        } catch (error) {
                            log.error("ファイルダウンロードエラー:", error.message);
                        }
                    }
                }
            }
        }

        // ボタンを無効化し
        function updateComponents (components) {
            for (const component of components) {
                if (component.type === 17 && component.components) { // Container
                    for (const section of component.components) {
                        // ボタンを無効化
                        if (section.type === 9 && section.accessory && section.accessory.type === 2) { // Section with button
                            section.accessory.disabled = true;
                            section.accessory.label = "✅ 対話チャンネル作成済み";
                            section.accessory.style = 2; // Secondary style
                            log.debug("ボタン無効化完了:", section.accessory.custom_id);
                        }
                        if (section.type === 13 && section.file && section.file.url) { // File component
                            const originalUrl = section.file.url;
                            const newFilename = fileUrlMap.get(originalUrl);
                            if (newFilename) {
                                section.file.url = `attachment://${newFilename}`;
                                log.debug("FileコンポーネントURL更新:", originalUrl, "→", section.file.url);
                            }
                        }
                    }
                } else if (component.type === 1 && component.components) { // ActionRow
                    for (const button of component.components) {
                        if (button.type === 2) { // Button
                            button.disabled = true;
                            button.label = "✅ 対話チャンネル作成済み";
                            button.style = 2; // Secondary style
                            log.debug("ActionRowボタン無効化完了:", button.custom_id);
                        }
                    }
                }
            }
            return components;
        }

        // コンポーネントを更新
        const updatedComponents = updateComponents(rawComponents);

        log.debug("メッセージ更新実行中...", {
            fileAttachments: fileAttachments.length,
            fileNames: fileAttachments.map(f => f.name)
        });

        // メッセージを更新
        await originalMessage.edit({
            components: updatedComponents,
            files: fileAttachments.length > 0 ? fileAttachments : undefined,
            flags: MessageFlags.IsComponentsV2
        });

        log.info("ボタン無効化：メッセージを正常に更新しました（ファイル再添付完了）");

        fileAttachments.forEach(attachment => {
            attachment.attachment = null;
        });
        fileAttachments.length = 0;

    } catch (error) {
        log.error("ボタン無効化エラー:", {
            message: error.message,
            stack: error.stack?.substring(0, 1000)
        });

        try {
            await interaction.followUp({
                content: "✅ 対話チャンネルが作成されました。\n-# ボタンの更新でエラーが発生しましたが、対話チャンネルは正常に作成されています。",
                flags: MessageFlags.Ephemeral
            });
        } catch (followUpError) {
            log.error("フォローアップエラー:", followUpError);
        }
    }
}
