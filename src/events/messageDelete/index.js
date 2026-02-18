import { Events } from "discord.js";
import { removeButtonRoleMessage } from "@/core/buttonRoles";

export const event = {
    name: Events.MessageDelete,
    once: false,
};

export const action = async (message) => {
    if (!message?.guildId || !message?.channelId || !message?.id) return;
    try {
        await removeButtonRoleMessage({
            guildId: message.guildId,
            channelId: message.channelId,
            messageId: message.id,
        });
    } catch (err) {
        console.warn("messageDelete 清理 button role 紀錄失敗:", err?.message ?? err);
    }
};
