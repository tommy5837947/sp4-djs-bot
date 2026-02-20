import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { syncFeatures } from "@/core/loader";

export const requiredPermission = "admin";

export const command = new SlashCommandBuilder()
    .setName("sync")
    .setDescription("掃描並同步最新指令/事件（包含新增資料夾）")
    .addStringOption((option) =>
        option
            .setName("scope")
            .setDescription("同步範圍")
            .setRequired(false)
            .addChoices(
                { name: "all", value: "all" },
                { name: "commands", value: "commands" },
                { name: "events", value: "events" },
            ),
    );

export const action = async (ctx) => {
    const scope = ctx.options.getString("scope") ?? "all";

    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    try {
        const result = await syncFeatures({ scope });
        await ctx.editReply(
            [
                "Sync 完成。",
                `scope: ${scope}`,
                result.commands ? `commands: ${result.commands.count} 個` : null,
                result.events ? `events: ${result.events.count} 個` : null,
            ].filter(Boolean).join("\n"),
        );
    } catch (err) {
        await ctx.editReply(`Sync 失敗: ${err.message}`);
    }
};
