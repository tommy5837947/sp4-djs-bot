import { Events } from "discord.js";
import { removeButtonRoleMessage } from "@/core/buttonRoles";

export const event = {
    name: Events.MessageBulkDelete,
    once: false,
};

export const action = async (messages) => {
    for (const [, message] of messages) {
        if (!message?.guildId || !message?.channelId || !message?.id) continue;
        try {
            await removeButtonRoleMessage({
                guildId: message.guildId,
                channelId: message.channelId,
                messageId: message.id,
            });
        } catch (err) {
            console.warn("messageDeleteBulk 清理 button role 紀錄失敗:", err?.message ?? err);
        }
    }
};
