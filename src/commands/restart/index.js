import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { spawn } from "child_process";

export const requiredPermission = "owner";

export const command = new SlashCommandBuilder()
    .setName("restart")
    .setDescription("快速重啟機器人（僅 owner）");

export const action = async (ctx) => {
    // 備註: 先 defer，避免互動在重啟期間超時導致 Unknown interaction
    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    await ctx.editReply("正在重啟機器人，請稍候...");

    // 備註: 重新啟動同一個 node + 參數，並讓新進程脫離當前進程
    const cmd = process.argv[0];
    const args = process.argv.slice(1);
    const child = spawn(cmd, args, {
        cwd: process.cwd(),
        detached: true,
        stdio: "ignore",
    });
    child.unref();

    setTimeout(() => process.exit(0), 800);
};
