import { REST, Routes } from "discord.js";
import fg from "fast-glob"

const updataSlashCommands = async(guildId, commands) => {
    const rest = new REST({version: 10}).setToken(process.env.TOKEN)

    const result = await rest.put(
        Routes.applicationGuildCommands(
            process.env.APPLICATION_ID,
            guildId,
        ),
        {
            body: commands,
        },
    )
    console.log(result)
}

export const loadCommands = async() => {

    const commands = []
    const files = await fg('./src/commands/**/index.js')
    for(const file of files) {
        const cmd = await import(file)
        commands.push(cmd.command)
    }

    await updataSlashCommands('728914201766133790', commands)
}
