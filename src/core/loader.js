import { REST, Routes, Collection } from "discord.js";
import fg from "fast-glob";
import { useAppStore } from "@/store/app";
import { markRaw } from "vue";

const importFresh = async (file) => import(`${file}?t=${Date.now()}`);

const getFolderNameFromFile = (file, rootName) => {
    const normalized = file.replaceAll("\\", "/");
    const marker = `/${rootName}/`;
    const start = normalized.indexOf(marker);
    if (start === -1) return null;
    const rel = normalized.slice(start + marker.length); // e.g. ping/index.js
    return rel.split("/")[0];
};

const updateSlashCommands = async (guildId, commands) => {
    const rest = new REST({ version: 10 }).setToken(process.env.TOKEN);
    await rest.put(
        Routes.applicationGuildCommands(
            process.env.APPLICATION_ID,
            guildId,
        ),
        {
            body: commands,
        },
    );
};

const ensureEnvForCommands = () => {
    if (!process.env.TOKEN) {
        throw new Error("缺少 TOKEN 環境變數");
    }
    if (!process.env.APPLICATION_ID) {
        throw new Error("缺少 APPLICATION_ID 環境變數");
    }
};

const ensureStoreMaps = (appStore) => {
    if (!appStore.commandsActionMap) {
        appStore.commandsActionMap = markRaw(new Collection());
    }
    if (!appStore.eventHandlerMap) {
        appStore.eventHandlerMap = markRaw(new Map());
    }
};

const getFeatureFolderNames = async (rootName) => {
    const files = await fg(`./src/${rootName}/**/index.js`);
    const names = files
        .map((f) => getFolderNameFromFile(f, rootName))
        .filter(Boolean);
    return [...new Set(names)].sort();
};

export const listReloadTargetNames = async ({ scope = "all" } = {}) => {
    if (scope === "commands") {
        return getFeatureFolderNames("commands");
    }
    if (scope === "events") {
        return getFeatureFolderNames("events");
    }

    const [commands, events] = await Promise.all([
        getFeatureFolderNames("commands"),
        getFeatureFolderNames("events"),
    ]);
    return [...new Set([...commands, ...events])].sort();
};

export const loadCommands = async ({ name } = {}) => {
    const appStore = useAppStore();
    ensureStoreMaps(appStore);
    ensureEnvForCommands();

    const files = await fg("./src/commands/**/index.js");
    const folderNames = files.map((f) => getFolderNameFromFile(f, "commands"));
    if (name && !folderNames.includes(name)) {
        throw new Error(`找不到指令資料夾: ${name}`);
    }

    const commands = [];
    const actions = new Collection();
    for (const file of files) {
        const cmd = await importFresh(file);
        commands.push(cmd.command.toJSON());
        actions.set(cmd.command.name, cmd.action);
    }

    const guildId = process.env.GUILD_ID || "728914201766133790";
    await updateSlashCommands(guildId, commands);
    appStore.commandsActionMap = markRaw(actions);

    return {
        reloaded: name ? [name] : folderNames,
        count: files.length,
    };
};

export const loadEvents = async ({ name } = {}) => {
    const appStore = useAppStore();
    ensureStoreMaps(appStore);
    const client = appStore.client;

    if (!client) {
        throw new Error("client 尚未初始化，無法載入事件");
    }

    const files = await fg("./src/events/**/index.js");
    const allFolders = files.map((f) => getFolderNameFromFile(f, "events"));
    if (name && !allFolders.includes(name)) {
        throw new Error(`找不到事件資料夾: ${name}`);
    }

    const targetFiles = name
        ? files.filter((f) => getFolderNameFromFile(f, "events") === name)
        : files;

    const loadedKeys = new Set();
    for (const file of targetFiles) {
        const folder = getFolderNameFromFile(file, "events");
        const eventFile = await importFresh(file);
        loadedKeys.add(folder);

        const prev = appStore.eventHandlerMap.get(folder);
        if (prev) {
            client.off(prev.name, prev.action);
        }

        if (eventFile.event.once) {
            client.once(eventFile.event.name, eventFile.action);
        } else {
            client.on(eventFile.event.name, eventFile.action);
        }

        appStore.eventHandlerMap.set(folder, {
            name: eventFile.event.name,
            action: eventFile.action,
            once: eventFile.event.once,
        });
    }

    if (!name) {
        for (const [folder, handler] of appStore.eventHandlerMap.entries()) {
            if (!loadedKeys.has(folder)) {
                // 備註: 若資料夾被刪除，同步解除舊事件監聽
                client.off(handler.name, handler.action);
                appStore.eventHandlerMap.delete(folder);
            }
        }
    }

    return {
        reloaded: name ? [name] : allFolders,
        count: targetFiles.length,
    };
};

export const reloadFeatures = async ({ scope = "all", name } = {}) => {
    const result = {};

    if (scope === "all" || scope === "commands") {
        result.commands = await loadCommands({ name: scope === "commands" ? name : undefined });
    }

    if (scope === "all" || scope === "events") {
        result.events = await loadEvents({ name: scope === "events" ? name : undefined });
    }

    return result;
};

export const syncFeatures = async ({ scope = "all" } = {}) => {
    // 備註: sync 用於重新掃描資料夾並註冊最新指令/事件
    return reloadFeatures({ scope });
};
