import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { reloadFeatures } from "@/core/loader";

export const requiredPermission = "admin";

export const command = new SlashCommandBuilder()
    .setName("reload")
    .setDescription("重新載入指令或事件（可指定單一功能）")
    .addStringOption((option) =>
        option
            .setName("scope")
            .setDescription("要重載的範圍")
            .setRequired(true)
            .addChoices(
                { name: "all", value: "all" },
                { name: "commands", value: "commands" },
                { name: "events", value: "events" },
            ),
    )
    .addStringOption((option) =>
        option
            .setName("name")
            .setDescription("指定資料夾名稱，例如 ping、messageCreate（可省略）")
            .setRequired(false)
            // 備註: 使用自動補全，動態讀取現有資料夾名稱
            .setAutocomplete(true),
    );

export const action = async (ctx) => {
    const scope = ctx.options.getString("scope", true);
    const name = ctx.options.getString("name") ?? undefined;

    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    try {
        const result = await reloadFeatures({ scope, name });
        await ctx.editReply(
            [
                "Reload 完成。",
                `scope: ${scope}`,
                `name: ${name ?? "全部"}`,
                result.commands ? `commands: ${result.commands.count} 個` : null,
                result.events ? `events: ${result.events.count} 個` : null,
            ].filter(Boolean).join("\n"),
        );
    } catch (err) {
        await ctx.editReply(`Reload 失敗: ${err.message}`);
    }
};
