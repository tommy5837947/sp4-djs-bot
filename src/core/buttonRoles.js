import fs from "fs/promises";
import path from "path";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.resolve(DATA_DIR, "button-roles.json");
const MAX_BUTTONS = 25;

let cache = null;

const makeMessageKey = ({ guildId, channelId, messageId }) =>
    `${guildId}:${channelId}:${messageId}`;

const readFileSafe = async () => {
    try {
        const raw = await fs.readFile(DATA_FILE, "utf8");
        return JSON.parse(raw);
    } catch (err) {
        if (err.code === "ENOENT") return { byMessage: {} };
        throw err;
    }
};

const ensureLoaded = async () => {
    if (cache) return cache;
    cache = await readFileSafe();
    if (!cache.byMessage) cache.byMessage = {};
    return cache;
};

const save = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(cache, null, 2), "utf8");
};

const ensureConfig = (data, { guildId, channelId, messageId }) => {
    const key = makeMessageKey({ guildId, channelId, messageId });
    if (!data.byMessage[key]) {
        data.byMessage[key] = {
            guildId,
            channelId,
            messageId,
            options: { once: false },
            buttons: [],
        };
    }
    if (!data.byMessage[key].options) data.byMessage[key].options = { once: false };
    if (typeof data.byMessage[key].options.once !== "boolean") data.byMessage[key].options.once = false;
    if (!Array.isArray(data.byMessage[key].buttons)) data.byMessage[key].buttons = [];
    return data.byMessage[key];
};

const buildButtonCustomId = (roleId) => `br:role:${roleId}`;

const buildRows = (buttons) => {
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder();
        const chunk = buttons.slice(i, i + 5);
        for (const btn of chunk) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(btn.customId)
                    .setLabel(btn.label)
                    .setStyle(ButtonStyle.Secondary),
            );
        }
        rows.push(row);
    }
    return rows;
};

const syncMessageComponents = async (client, config) => {
    const channel = await client.channels.fetch(config.channelId);
    if (!channel?.isTextBased?.()) throw new Error("頻道不存在或非文字頻道");
    const message = await channel.messages.fetch(config.messageId);
    await message.edit({ components: buildRows(config.buttons) });
    return message;
};

export const upsertButtonRoleBinding = async ({
    client,
    guildId,
    channelId,
    messageId,
    roleId,
    label,
    once,
}) => {
    const data = await ensureLoaded();
    const config = ensureConfig(data, { guildId, channelId, messageId });
    if (typeof once === "boolean") config.options.once = once;

    const customId = buildButtonCustomId(roleId);
    const existing = config.buttons.find((b) => b.customId === customId);
    if (existing) {
        existing.label = label;
    } else {
        if (config.buttons.length >= MAX_BUTTONS) {
            throw new Error("同一訊息最多只能綁定 25 個按鈕");
        }
        config.buttons.push({ customId, roleId, label });
    }

    await save();
    const message = await syncMessageComponents(client, config);
    return { message, config };
};

export const getButtonRoleConfig = async ({ guildId, channelId, messageId }) => {
    const data = await ensureLoaded();
    return data.byMessage[makeMessageKey({ guildId, channelId, messageId })] ?? null;
};

export const removeButtonRoleMessage = async ({ guildId, channelId, messageId }) => {
    const data = await ensureLoaded();
    const key = makeMessageKey({ guildId, channelId, messageId });
    if (!data.byMessage[key]) return false;
    delete data.byMessage[key];
    await save();
    return true;
};

export const syncButtonRoleMessages = async (client) => {
    const data = await ensureLoaded();
    const records = Object.values(data.byMessage);
    let cleaned = 0;

    for (const config of records) {
        try {
            await syncMessageComponents(client, config);
        } catch {
            await removeButtonRoleMessage(config);
            cleaned += 1;
        }
    }

    return { total: records.length, cleaned };
};

export const handleButtonRoleInteraction = async (interaction) => {
    if (!interaction.inGuild()) {
        await interaction.reply({ content: "此按鈕僅能在伺服器使用。", flags: MessageFlags.Ephemeral });
        return;
    }

    const config = await getButtonRoleConfig({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        messageId: interaction.message.id,
    });
    if (!config) {
        await interaction.reply({ content: "此按鈕尚未綁定身份組。", flags: MessageFlags.Ephemeral });
        return;
    }

    const target = config.buttons.find((b) => b.customId === interaction.customId);
    if (!target) {
        await interaction.reply({ content: "找不到對應身份組設定。", flags: MessageFlags.Ephemeral });
        return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const roleId = target.roleId;
    const hasRole = member.roles.cache.has(roleId);

    if (hasRole) {
        await member.roles.remove(roleId, "Button role toggle remove");
        await interaction.reply({ content: `身份組已刪除：<@&${roleId}>`, flags: MessageFlags.Ephemeral });
        return;
    }

    if (config.options?.once) {
        const removedRoleIds = [];
        for (const btn of config.buttons) {
            if (btn.roleId !== roleId && member.roles.cache.has(btn.roleId)) {
                await member.roles.remove(btn.roleId, "Button role once mode remove");
                removedRoleIds.push(btn.roleId);
            }
        }

        await member.roles.add(roleId, "Button role add");
        if (removedRoleIds.length > 0) {
            const fromText = removedRoleIds.map((id) => `<@&${id}>`).join("、");
            await interaction.reply({
                content: `身份組已從 ${fromText} 換成 <@&${roleId}>`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.reply({ content: `身份組已新增：<@&${roleId}>`, flags: MessageFlags.Ephemeral });
        return;
    }

    await member.roles.add(roleId, "Button role add");
    await interaction.reply({ content: `身份組已新增：<@&${roleId}>`, flags: MessageFlags.Ephemeral });
};
