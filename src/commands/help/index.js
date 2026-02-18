import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { buildHelpEmbed, buildHelpMenuRow } from "@/core/helpCenter";

export const command = new SlashCommandBuilder()
    .setName("help")
    .setDescription("顯示指令說明（下拉選單）");

export const action = async (ctx) => {
    await ctx.reply({
        embeds: [buildHelpEmbed("reactionrole")],
        components: [buildHelpMenuRow()],
        flags: MessageFlags.Ephemeral,
    });
};
