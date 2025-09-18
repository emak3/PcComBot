const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require("discord.js");
const log = require("../../core/logger.js");
const Database = require("../../core/database.js");
const DiscordHelpers = require("../../utils/discordHelpers.js");
const ErrorHandler = require("../../utils/errorHandler.js");

const excludedThreads = new Set(); // 除外スレッドのID一覧（キャッシュ）
let database = null;
let lastCacheUpdate = 0;
const CACHE_EXPIRE_TIME = 5 * 60 * 1000; // 5分でキャッシュ更新

/**
 * データベース初期化
 * @returns {boolean} データベース接続状態
 */
function initDatabase () {
    if (!database) {
        database = new Database();
    }
    return database.isConnected();
}

/**
 * フォーラムチェック除外チャンネルを管理するコマンド
 * @module ForumExcludeCommand
 */
module.exports = {
    command: new SlashCommandBuilder()
        .setName("forum-exclude")
        .setDescription("フォーラムチェック除外スレッドを管理します")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("フォーラムスレッドをチェック除外リストに追加")
                .addChannelOption(option =>
                    option
                        .setName("thread")
                        .setDescription("除外するフォーラムスレッド")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.PublicThread, ChannelType.PrivateThread)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("フォーラムスレッドをチェック除外リストから削除")
                .addChannelOption(option =>
                    option
                        .setName("thread")
                        .setDescription("除外を解除するフォーラムスレッド")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.PublicThread, ChannelType.PrivateThread)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("フォーラムチェック除外チャンネル一覧を表示")
        ),

    /**
     * コマンドを実行
     * @param {CommandInteraction} interaction - Discord インタラクション
     */
    async execute (interaction) {
        return await ErrorHandler.standardTryCatch(async () => {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
            case "add":
                await handleAdd(interaction);
                break;
            case "remove":
                await handleRemove(interaction);
                break;
            case "list":
                await handleList(interaction);
                break;
            default:
                throw new Error(`未知のサブコマンド: ${subcommand}`);
            }
        }, "forum-exclude コマンド実行", log).catch(async (error) => {
            await ErrorHandler.handleDiscordError(error, interaction, "forum-exclude コマンド");
        });
    },

    // 除外チャンネル管理用の関数をエクスポート
    async isChannelExcluded (channelId) {
        await this.loadExcludedChannels();
        return excludedThreads.has(channelId);
    },

    async addExcludedChannel (channelId) {
        excludedThreads.add(channelId);
        await this.saveToFirebase(channelId, true);
    },

    async removeExcludedChannel (channelId) {
        excludedThreads.delete(channelId);
        await this.saveToFirebase(channelId, false);
    },

    async getExcludedChannels () {
        await this.loadExcludedChannels();
        return Array.from(excludedThreads);
    },

    // Firebase関連の内部関数
    async loadExcludedChannels () {
        const now = Date.now();

        // キャッシュが有効な場合はスキップ
        if (now - lastCacheUpdate < CACHE_EXPIRE_TIME) {
            return;
        }

        if (!initDatabase()) {
            log.warn("Firebase未接続のため、メモリキャッシュを使用します");
            return;
        }

        try {
            const db = database.getFirestore();
            const snapshot = await db.collection("forumExcludedChannels").get();

            excludedThreads.clear();
            snapshot.forEach(doc => {
                if (doc.data().excluded) {
                    excludedThreads.add(doc.id);
                }
            });

            lastCacheUpdate = now;
            log.debug(`除外チャンネル ${excludedThreads.size}件をFirebaseから読み込みました`);

            // 古いデータのクリーンアップ（30日以上古いデータを削除）
            await this.cleanupOldData();

        } catch (error) {
            log.error("Firebase除外チャンネル読み込みエラー:", error);
        }
    },

    async saveToFirebase (channelId, excluded) {
        if (!initDatabase()) {
            log.warn("Firebase未接続のため、メモリのみに保存されます");
            return;
        }

        try {
            const db = database.getFirestore();
            const doc = db.collection("forumExcludedChannels").doc(channelId);

            if (excluded) {
                await doc.set({
                    excluded: true,
                    addedAt: new Date(),
                    lastUpdated: new Date()
                });
                log.debug(`チャンネル ${channelId} を除外リストに追加（Firebase）`);
            } else {
                await doc.delete();
                log.debug(`チャンネル ${channelId} を除外リストから削除（Firebase）`);
            }
        } catch (error) {
            log.error("Firebase除外チャンネル保存エラー:", error);
        }
    },

    async cleanupOldData () {
        if (!initDatabase()) return;

        try {
            const db = database.getFirestore();
            const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

            const oldDocsSnapshot = await db.collection("forumExcludedChannels")
                .where("addedAt", "<", thirtyDaysAgo)
                .get();

            if (oldDocsSnapshot.empty) return;

            const batch = db.batch();
            oldDocsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            log.info(`古い除外チャンネルデータ ${oldDocsSnapshot.size}件を削除しました`);

        } catch (error) {
            log.error("古いデータのクリーンアップエラー:", error);
        }
    }
};

/**
 * チャンネルを除外リストに追加
 * @param {CommandInteraction} interaction - Discord インタラクション
 */
async function handleAdd (interaction) {
    return await ErrorHandler.standardTryCatch(async () => {
        const channel = interaction.options.getChannel("thread");

        // まず現在のデータをロード
        await module.exports.loadExcludedChannels();

        if (excludedThreads.has(channel.id)) {
            const warningEmbed = DiscordHelpers.createWarningEmbed(
                "⚠️ 注意",
                `**${channel.name}** は既に除外リストに登録されています。`
            );
            return await DiscordHelpers.safeReply(interaction, { embeds: [warningEmbed] }, { flags: MessageFlags.Ephemeral });
        }

        await module.exports.addExcludedChannel(channel.id);

        const successEmbed = DiscordHelpers.createSuccessEmbed(
            "✅ 除外設定完了",
            `**${channel.name}** をフォーラムチェック除外リストに追加しました。`,
            {
                fields: [
                    { name: "チャンネル", value: `<#${channel.id}>`, inline: true },
                    { name: "チャンネルID", value: channel.id, inline: true }
                ]
            }
        );

        await DiscordHelpers.safeReply(interaction, { embeds: [successEmbed] });
        log.info(`フォーラムチェック除外チャンネルに追加: ${channel.name} (${channel.id})`);
    }, "チャンネル除外追加処理", log);
}

/**
 * チャンネルを除外リストから削除
 * @param {CommandInteraction} interaction - Discord インタラクション
 */
async function handleRemove (interaction) {
    return await ErrorHandler.standardTryCatch(async () => {
        const channel = interaction.options.getChannel("thread");

        // まず現在のデータをロード
        await module.exports.loadExcludedChannels();

        if (!excludedThreads.has(channel.id)) {
            const warningEmbed = DiscordHelpers.createWarningEmbed(
                "⚠️ 注意",
                `**${channel.name}** は除外リストに登録されていません。`
            );
            return await DiscordHelpers.safeReply(interaction, { embeds: [warningEmbed] }, { flags: MessageFlags.Ephemeral });
        }

        await module.exports.removeExcludedChannel(channel.id);

        const successEmbed = DiscordHelpers.createSuccessEmbed(
            "✅ 除外解除完了",
            `**${channel.name}** をフォーラムチェック除外リストから削除しました。`,
            {
                fields: [
                    { name: "チャンネル", value: `<#${channel.id}>`, inline: true },
                    { name: "チャンネルID", value: channel.id, inline: true }
                ]
            }
        );

        await DiscordHelpers.safeReply(interaction, { embeds: [successEmbed] });
        log.info(`フォーラムチェック除外チャンネルから削除: ${channel.name} (${channel.id})`);
    }, "チャンネル除外削除処理", log);
}

/**
 * 除外チャンネル一覧を表示
 * @param {CommandInteraction} interaction - Discord インタラクション
 */
async function handleList (interaction) {
    return await ErrorHandler.standardTryCatch(async () => {
        // まず現在のデータをロード
        await module.exports.loadExcludedChannels();

        if (excludedThreads.size === 0) {
            const infoEmbed = DiscordHelpers.createInfoEmbed(
                "📋 フォーラムチェック除外チャンネル一覧",
                "現在除外設定されているチャンネルはありません。"
            );
            return await DiscordHelpers.safeReply(interaction, { embeds: [infoEmbed] });
        }

        const channelList = Array.from(excludedThreads)
            .map(channelId => {
                const channel = interaction.guild.channels.cache.get(channelId);
                return channel ? `• <#${channelId}> (${channel.name})` : `• ${channelId} (チャンネルが見つかりません)`;
            })
            .join("\n");

        const listEmbed = DiscordHelpers.createInfoEmbed(
            "📋 フォーラムチェック除外チャンネル一覧",
            channelList,
            {
                fields: [
                    { name: "除外チャンネル数", value: `${excludedThreads.size}個`, inline: true }
                ]
            }
        );

        await DiscordHelpers.safeReply(interaction, { embeds: [listEmbed] });
    }, "除外チャンネル一覧表示処理", log);
}
