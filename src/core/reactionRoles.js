import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.resolve(DATA_DIR, "reaction-roles.json");

let cache = null;
const autoCleanupKeys = new Set();

const makeMessageKey = ({ guildId, channelId, messageId }) =>
    `${guildId}:${channelId}:${messageId}`;

const parseEmojiIdentifier = (emojiInput) => {
    const value = String(emojiInput ?? "").trim();
    const match = value.match(/^<a?:\w+:(\d+)>$/);
    if (match) {
        return { reactionValue: match[1], storageKey: match[1] };
    }
    return { reactionValue: value, storageKey: value };
};

const makeReactionUserKey = ({
    guildId,
    channelId,
    messageId,
    userId,
    emojiKey,
}) => `${guildId}:${channelId}:${messageId}:${userId}:${emojiKey}`;

const readFileSafe = async () => {
    try {
        const raw = await fs.readFile(DATA_FILE, "utf8");
        return JSON.parse(raw);
    } catch (err) {
        if (err.code === "ENOENT") {
            return { byMessage: {} };
        }
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

const deleteMessageKey = async (key) => {
    const data = await ensureLoaded();
    if (!data.byMessage[key]) return false;
    delete data.byMessage[key];
    await save();
    return true;
};

const ensureMessageConfig = (data, { guildId, channelId, messageId }) => {
    const key = makeMessageKey({ guildId, channelId, messageId });
    if (!data.byMessage[key]) {
        data.byMessage[key] = {
            guildId,
            channelId,
            messageId,
            emojiRoleMap: {},
            options: {
                once: false,
            },
        };
    }
    if (!data.byMessage[key].options) {
        data.byMessage[key].options = { once: false };
    }
    if (typeof data.byMessage[key].options.once !== "boolean") {
        data.byMessage[key].options.once = false;
    }
    return data.byMessage[key];
};

export const addReactionRoleBinding = async ({
    guildId,
    channelId,
    messageId,
    emojiInput,
    roleId,
    once,
}) => {
    const data = await ensureLoaded();
    const config = ensureMessageConfig(data, { guildId, channelId, messageId });
    const parsed = parseEmojiIdentifier(emojiInput);

    if (!parsed.storageKey) {
        throw new Error("emoji 格式無效");
    }

    config.emojiRoleMap[parsed.storageKey] = roleId;
    if (typeof once === "boolean") {
        config.options.once = once;
    }
    await save();

    return parsed;
};

export const getReactionRoleConfig = async ({
    guildId,
    channelId,
    messageId,
}) => {
    const data = await ensureLoaded();
    const key = makeMessageKey({ guildId, channelId, messageId });
    return data.byMessage[key] ?? null;
};

export const removeReactionRoleMessage = async ({ guildId, channelId, messageId }) => {
    const key = makeMessageKey({ guildId, channelId, messageId });
    return deleteMessageKey(key);
};

export const resolveReactionRoleId = ({ config, emojiId, emojiName }) => {
    if (!config) return null;
    if (emojiId && config.emojiRoleMap[emojiId]) return config.emojiRoleMap[emojiId];
    if (emojiName && config.emojiRoleMap[emojiName]) return config.emojiRoleMap[emojiName];
    return null;
};

export const listMessageRoleIds = (config) => {
    if (!config) return [];
    return [...new Set(Object.values(config.emojiRoleMap))];
};

export const markAutoCleanupReaction = ({
    guildId,
    channelId,
    messageId,
    userId,
    emojiKey,
}) => {
    const key = makeReactionUserKey({ guildId, channelId, messageId, userId, emojiKey });
    autoCleanupKeys.add(key);
    setTimeout(() => autoCleanupKeys.delete(key), 15000);
};

export const consumeAutoCleanupReaction = ({
    guildId,
    channelId,
    messageId,
    userId,
    emojiKey,
}) => {
    const key = makeReactionUserKey({ guildId, channelId, messageId, userId, emojiKey });
    if (!autoCleanupKeys.has(key)) return false;
    autoCleanupKeys.delete(key);
    return true;
};

export const syncReactionRoleMessages = async (client) => {
    const data = await ensureLoaded();
    const records = Object.values(data.byMessage);
    let cleaned = 0;

    for (const item of records) {
        const key = makeMessageKey(item);
        try {
            const channel = await client.channels.fetch(item.channelId);
            if (!channel?.isTextBased?.()) {
                if (await deleteMessageKey(key)) cleaned += 1;
                continue;
            }
            const message = await channel.messages.fetch(item.messageId);
            const emojis = Object.keys(item.emojiRoleMap ?? {});
            for (const emoji of emojis) {
                try {
                    await message.react(emoji);
                } catch (err) {
                    console.warn(`reactionrole emoji 同步失敗: ${emoji}`, err?.message ?? err);
                }
            }
        } catch (err) {
            console.warn(
                `reactionrole 訊息同步失敗: ${item.guildId}/${item.channelId}/${item.messageId}`,
                err?.message ?? err,
            );
            // 備註: 若訊息/頻道被刪除，移除資料避免下次開機重複報錯
            if (await deleteMessageKey(key)) cleaned += 1;
        }
    }

    return { total: records.length, cleaned };
};
