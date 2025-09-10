// eslint-disable-next-line no-unused-vars
const { Events, Client, Routes, ActivityType } = require("discord.js");
const log = require("../../core/logger.js");

module.exports = {
    name: Events.ClientReady,
    /**
     * @param {Client} client
     */
    async execute (client) {
        log.debug("login:" + client.user.tag);
        client.user.setPresence({ status: "idle" });
        const commands = [];
        for (const command of client.commands.values()) {
            commands.push(command.command.toJSON());
        }
        (async () => {
            try {
                log.info(`Started refreshing ${commands.length} application (/) commands.`);
                const data = await client.rest.put(Routes.applicationCommands(client.user.id), {
                    body: commands
                });
                log.info(`${data.length} 個のApplication Commandsを登録。`);
            } catch (error) {
                log.error(error);
            }
        })();
    }
};
