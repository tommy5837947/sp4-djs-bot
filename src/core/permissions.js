import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.resolve(DATA_DIR, "permissions.json");

const BASE_OWNER_IDS = ["422772162735374346"];
const EXTRA_OWNER_IDS = (process.env.BOT_OWNER_IDS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const OWNER_IDS = new Set([...BASE_OWNER_IDS, ...EXTRA_OWNER_IDS]);

const LEVEL_SCORE = {
    user: 0,
    mod: 50,
    admin: 80,
    owner: 100,
};

let cache = null;

const ensureLoaded = async () => {
    if (cache) return cache;
    try {
        const raw = await fs.readFile(DATA_FILE, "utf8");
        cache = JSON.parse(raw);
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
        cache = { guilds: {} };
    }
    if (!cache.guilds) cache.guilds = {};
    return cache;
};

const save = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(cache, null, 2), "utf8");
};

const normalizeLevel = (level) => {
    const raw = String(level ?? "").toLowerCase();
    if (raw === "moderator") return "mod";
    if (raw in LEVEL_SCORE) return raw;
    return "user";
};

const getGuildMap = (data, guildId, create = false) => {
    const key = String(guildId ?? "global");
    if (!data.guilds[key] && create) data.guilds[key] = {};
    return data.guilds[key] ?? {};
};

export const isOwner = (userId) => OWNER_IDS.has(String(userId));

export const getUserPermissionLevel = async ({ guildId, userId }) => {
    const uid = String(userId);
    if (isOwner(uid)) return "owner";
    const data = await ensureLoaded();
    const map = getGuildMap(data, guildId);
    return normalizeLevel(map[uid] ?? "user");
};

export const hasPermission = async ({ guildId, userId, required = "user" }) => {
    const requiredLevel = normalizeLevel(required);
    const currentLevel = await getUserPermissionLevel({ guildId, userId });
    return LEVEL_SCORE[currentLevel] >= LEVEL_SCORE[requiredLevel];
};

export const setGuildUserPermission = async ({ guildId, userId, level }) => {
    const uid = String(userId);
    if (isOwner(uid)) {
        throw new Error("無法修改 owner 的固定權限");
    }
    const normalized = normalizeLevel(level);
    if (normalized === "owner") {
        throw new Error("owner 為保留等級，無法手動設定");
    }
    const data = await ensureLoaded();
    const map = getGuildMap(data, guildId, true);
    map[uid] = normalized;
    await save();
    return normalized;
};

export const clearGuildUserPermission = async ({ guildId, userId }) => {
    const uid = String(userId);
    if (isOwner(uid)) {
        throw new Error("無法清除 owner 的固定權限");
    }
    const data = await ensureLoaded();
    const map = getGuildMap(data, guildId, true);
    delete map[uid];
    await save();
    return true;
};

export const listGuildPermissions = async ({ guildId }) => {
    const data = await ensureLoaded();
    const map = getGuildMap(data, guildId);
    const rows = Object.entries(map).map(([userId, level]) => ({
        userId,
        level: normalizeLevel(level),
    }));
    rows.sort((a, b) => LEVEL_SCORE[b.level] - LEVEL_SCORE[a.level] || a.userId.localeCompare(b.userId));
    return rows;
};

export const getPermissionChoices = () => [
    { name: "admin", value: "admin" },
    { name: "mod", value: "mod" },
    { name: "user", value: "user" },
];

