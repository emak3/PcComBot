const { EmbedBuilder, MessageFlags } = require("discord.js");

class DiscordHelpers {
    static createErrorEmbed(title = "❌ エラー", description, options = {}) {
        const embed = new EmbedBuilder()
            .setColor("#ff0000")
            .setTitle(title)
            .setTimestamp();
        
        if (description) {
            embed.setDescription(description);
        }
        
        if (options.fields) {
            embed.addFields(options.fields);
        }
        
        if (options.footer) {
            embed.setFooter(options.footer);
        }
        
        if (options.thumbnail) {
            embed.setThumbnail(options.thumbnail);
        }
        
        return embed;
    }

    static createSuccessEmbed(title = "✅ 完了", description, options = {}) {
        const embed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle(title)
            .setTimestamp();
        
        if (description) {
            embed.setDescription(description);
        }
        
        if (options.fields) {
            embed.addFields(options.fields);
        }
        
        if (options.footer) {
            embed.setFooter(options.footer);
        }
        
        if (options.thumbnail) {
            embed.setThumbnail(options.thumbnail);
        }
        
        return embed;
    }

    static createInfoEmbed(title, description, options = {}) {
        const embed = new EmbedBuilder()
            .setColor(options.color || "#0099ff")
            .setTimestamp();
        
        if (title) {
            embed.setTitle(title);
        }
        
        if (description) {
            embed.setDescription(description);
        }
        
        if (options.fields) {
            embed.addFields(options.fields);
        }
        
        if (options.footer) {
            embed.setFooter(options.footer);
        }
        
        if (options.thumbnail) {
            embed.setThumbnail(options.thumbnail);
        }
        
        if (options.image) {
            embed.setImage(options.image);
        }
        
        return embed;
    }

    static async safeReply(interaction, content, options = {}) {
        try {
            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply(content);
            } else {
                return await interaction.reply({
                    ...content,
                    flags: options.ephemeral ? MessageFlags.Ephemeral : undefined,
                    ...options
                });
            }
        } catch (error) {
            console.error("Reply送信エラー:", error);
            throw error;
        }
    }

    static async safeMessageSend(channel, content, options = {}) {
        try {
            return await channel.send({
                ...content,
                ...options
            });
        } catch (error) {
            console.error("メッセージ送信エラー:", error);
            throw error;
        }
    }

    static async safeDeferReply(interaction, options = {}) {
        try {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.deferReply({
                    flags: options.ephemeral ? MessageFlags.Ephemeral : undefined,
                    ...options
                });
            }
        } catch (error) {
            console.error("deferReply失敗:", error);
            throw error;
        }
    }

    static createWarningEmbed(title = "⚠️ 警告", description, options = {}) {
        const embed = new EmbedBuilder()
            .setColor("#ffaa00")
            .setTitle(title)
            .setTimestamp();
        
        if (description) {
            embed.setDescription(description);
        }
        
        if (options.fields) {
            embed.addFields(options.fields);
        }
        
        if (options.footer) {
            embed.setFooter(options.footer);
        }
        
        return embed;
    }

    static hasPermission(member, permission) {
        return member && member.permissions && member.permissions.has(permission);
    }

    static async handlePermissionError(interaction, requiredPermission) {
        const errorEmbed = this.createErrorEmbed(
            "❌ 権限不足",
            `このコマンドを使用するには「${requiredPermission}」権限が必要です。`
        );
        
        return await this.safeReply(interaction, {
            embeds: [errorEmbed]
        }, { flags: MessageFlags.Ephemeral });
    }
}

module.exports = DiscordHelpers;