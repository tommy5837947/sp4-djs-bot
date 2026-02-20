import { MessageFlags, SlashCommandBuilder } from "discord.js";
import {
    clearGuildUserPermission,
    getPermissionChoices,
    getUserPermissionLevel,
    listGuildPermissions,
    setGuildUserPermission,
} from "@/core/permissions";

const LEVEL_CHOICES = getPermissionChoices();

export const requiredPermission = "admin";

export const command = new SlashCommandBuilder()
    .setName("permission")
    .setDescription("查看與管理機器人內部權限")
    .addSubcommand((sub) =>
        sub
            .setName("me")
            .setDescription("查看自己的權限等級"),
    )
    .addSubcommand((sub) =>
        sub
            .setName("view")
            .setDescription("查看指定使用者的權限")
            .addUserOption((option) =>
                option.setName("user").setDescription("要查看的使用者").setRequired(true),
            ),
    )
    .addSubcommand((sub) =>
        sub
            .setName("list")
            .setDescription("列出本伺服器目前設定的權限"),
    )
    .addSubcommand((sub) =>
        sub
            .setName("set")
            .setDescription("設定使用者權限")
            .addUserOption((option) =>
                option.setName("user").setDescription("目標使用者").setRequired(true),
            )
            .addStringOption((option) =>
                option
                    .setName("level")
                    .setDescription("要設定的權限")
                    .setRequired(true)
                    .addChoices(...LEVEL_CHOICES),
            ),
    )
    .addSubcommand((sub) =>
        sub
            .setName("clear")
            .setDescription("清除使用者自訂權限（回到 user）")
            .addUserOption((option) =>
                option.setName("user").setDescription("目標使用者").setRequired(true),
            ),
    );

const ensureGuild = (ctx) => {
    if (!ctx.guildId) {
        throw new Error("此指令僅能在伺服器中使用");
    }
};

const PERMISSION_ORDER = ["owner", "admin", "mod", "user"];

const groupPermissionRows = (rows) => {
    const groups = new Map(PERMISSION_ORDER.map((x) => [x, []]));
    for (const row of rows) {
        const level = PERMISSION_ORDER.includes(row.level) ? row.level : "user";
        groups.get(level).push(`<@${row.userId}>`);
    }
    return groups;
};

export const action = async (ctx) => {
    await ctx.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        ensureGuild(ctx);
        const sub = ctx.options.getSubcommand(true);
        const guildId = ctx.guildId;

        if (sub === "me") {
            const level = await getUserPermissionLevel({ guildId, userId: ctx.user.id });
            await ctx.editReply(`你的權限等級: ${level}`);
            return;
        }

        if (sub === "view") {
            const user = ctx.options.getUser("user", true);
            const level = await getUserPermissionLevel({ guildId, userId: user.id });
            await ctx.editReply(`${user.tag} 的權限等級: ${level}`);
            return;
        }

        if (sub === "list") {
            const rows = await listGuildPermissions({ guildId });
            const groups = groupPermissionRows(rows);
            groups.get("owner").unshift("<@422772162735374346>");

            const lines = ["> **目前權限設定**"];
            for (const level of PERMISSION_ORDER) {
                const members = groups.get(level) ?? [];
                lines.push(`> **${level.toUpperCase()}**`);
                if (members.length === 0) {
                    lines.push(">  （無）");
                } else {
                    lines.push(`>  ${members.join("、")}`);
                }
            }

            await ctx.editReply(lines.join("\n"));
            return;
        }

        if (sub === "set") {
            const user = ctx.options.getUser("user", true);
            const level = ctx.options.getString("level", true);
            const applied = await setGuildUserPermission({
                guildId,
                userId: user.id,
                level,
            });
            await ctx.editReply(`已設定 ${user.tag} 權限為 ${applied}`);
            return;
        }

        if (sub === "clear") {
            const user = ctx.options.getUser("user", true);
            await clearGuildUserPermission({
                guildId,
                userId: user.id,
            });
            await ctx.editReply(`已清除 ${user.tag} 的自訂權限（回到 user）`);
            return;
        }
    } catch (err) {
        await ctx.editReply(`permission 指令失敗: ${err.message}`);
    }
};
