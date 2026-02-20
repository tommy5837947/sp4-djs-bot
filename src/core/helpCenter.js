import { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";

const HELP_MENU_ID = "help:menu";

const HELP_TOPICS = [
    {
        label: "身份組按鈕",
        value: "reactionrole",
        description: "建立與管理按鈕身份組",
        content: [
            "1. 建立新面板：",
            "   `/reactionrole create message role label [style] [channel] [once]`",
            "2. 綁定既有訊息：",
            "   `/reactionrole bind [channel] message_id_or_link role label [once]`",
            "3. `style=embed/plain` 可切換建立訊息樣式。",
            "4. `once=true`：同一面板中，一人同時只會保留一個身份組。",
            "5. 最便捷：右鍵訊息 -> Apps -> `Bind Role Button`。",
            "6. `bind` 可直接貼「訊息連結」，可不填頻道。",
            "7. label 可用自訂表情格式：`<:emoji_name:emoji_id> 按鈕文字`。",
            "8. create 的 message 也支援 `:emoji_name:` 自動轉伺服器自訂表情。",
        ],
    },
    {
        label: "重新載入",
        value: "reload",
        description: "重新載入指令與事件",
        content: [
            "1. 全部重載：`/reload scope:all`",
            "2. 重載特定指令：`/reload scope:commands name:ping`",
            "3. 重載特定事件：`/reload scope:events name:interactionCreate`",
        ],
    },
    {
        label: "同步掃描",
        value: "sync",
        description: "掃描並同步新增模組",
        content: [
            "1. 全部同步：`/sync`",
            "2. 僅同步指令：`/sync scope:commands`",
            "3. 僅同步事件：`/sync scope:events`",
        ],
    },
    {
        label: "常見問題",
        value: "common",
        description: "排錯與權限提醒",
        content: [
            "1. 修改指令後先執行 `/sync`。",
            "2. 身份組功能需要 `Manage Roles` 權限。",
            "3. Bot 的角色高度必須高於目標身份組。",
            "4. 可用右鍵訊息 -> Apps -> `Bind Role Button` 快速綁定。",
            "5. 權限管理：`/permission me|view|list|set|clear`。",
            "6. 快速重啟（僅 owner）：`/restart`。",
        ],
    },
];

const getTopic = (value) => HELP_TOPICS.find((x) => x.value === value) ?? HELP_TOPICS[0];

const HELP_COLOR = 0x4f8cff;

export const buildHelpMenuRow = () =>
    new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(HELP_MENU_ID)
            .setPlaceholder("選擇要查看的指令說明")
            .addOptions(
                HELP_TOPICS.map((x) => ({
                    label: x.label,
                    value: x.value,
                    description: x.description,
                })),
            ),
    );

export const buildHelpEmbed = (value) => {
    const topic = getTopic(value);
    const quoteText = topic.content.map((line) => `> ${line}`).join("\n");
    return new EmbedBuilder()
        .setColor(HELP_COLOR)
        .setTitle(`說明中心｜${topic.label}`)
        .setDescription(`${topic.description}\n\n${quoteText}`)
        .addFields({
            name: "快速提示",
            value: "> 使用下拉選單切換主題\n> 所有指令都可搭配 `/help` 回來查詢",
        })
        .setFooter({ text: "SP4 Discord Bot Help" });
};

export const handleHelpMenuInteraction = async (interaction) => {
    const value = interaction.values?.[0] ?? "reactionrole";
    await interaction.update({
        embeds: [buildHelpEmbed(value)],
        components: [buildHelpMenuRow()],
    });
};

export const HELP_MENU_CUSTOM_ID = HELP_MENU_ID;

