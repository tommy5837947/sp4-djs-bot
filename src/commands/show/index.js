import { SlashCommandBuilder } from 'discord.js'

export const command = new SlashCommandBuilder()
    .setName('show')
    .setDescription('顯示目前互動資訊')


export const action = async (ctx) => {
    // 備註: slash command 不會有 ctx.content，改為直接回覆可用資訊
    await ctx.reply(
        [
            `command: ${ctx.commandName}`,
            `user: ${ctx.user.tag}`,
            `channelId: ${ctx.channelId}`,
            `guildId: ${ctx.guildId ?? 'DM'}`,
        ].join('\n')
    )
}
