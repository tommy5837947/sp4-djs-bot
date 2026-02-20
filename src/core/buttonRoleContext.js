import {
    ActionRowBuilder,
    MessageFlags,
    ModalBuilder,
    PermissionFlagsBits,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { upsertButtonRoleBinding } from "@/core/buttonRoles";
import { useAppStore } from "@/store/app";
import { hasPermission } from "@/core/permissions";

const CONTEXT_PREFIX = "br:ctx:";
const MODAL_PREFIX = "br:modal:";

const canManageRole = (interaction, role) => {
    const me = interaction.guild?.members?.me;
    if (!me) return false;
    return me.roles.highest.position > role.position;
};

const parseOnce = (value) => {
    const raw = String(value ?? "").trim().toLowerCase();
    if (!raw) return undefined;
    if (["1", "true", "yes", "y", "on"].includes(raw)) return true;
    if (["0", "false", "no", "n", "off"].includes(raw)) return false;
    throw new Error("once 僅接受 true/false、on/off、yes/no、1/0");
};

export const isButtonRoleContextCommand = (interaction) =>
    interaction.isMessageContextMenuCommand() && interaction.commandName === "Bind Role Button";

export const showButtonRoleContextModal = async (interaction) => {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.reply({ content: "你沒有 Manage Roles 權限。", flags: MessageFlags.Ephemeral });
        return;
    }

    const message = interaction.targetMessage;
    const modal = new ModalBuilder()
        .setCustomId(`${MODAL_PREFIX}${message.channelId}:${message.id}`)
        .setTitle("Bind Role Button");

    const roleIdInput = new TextInputBuilder()
        .setCustomId("role_id")
        .setLabel("Role ID (必要)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder("例如: 123456789012345678");

    const labelInput = new TextInputBuilder()
        .setCustomId("label")
        .setLabel("Button Label (必要)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(80)
        .setPlaceholder("例如: 選擇身分組");

    const onceInput = new TextInputBuilder()
        .setCustomId("once")
        .setLabel("Once (選填: true/false)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder("不填=沿用原設定");

    modal.addComponents(
        new ActionRowBuilder().addComponents(roleIdInput),
        new ActionRowBuilder().addComponents(labelInput),
        new ActionRowBuilder().addComponents(onceInput),
    );

    await interaction.showModal(modal);
};

export const isButtonRoleContextModal = (interaction) =>
    interaction.isModalSubmit() && interaction.customId.startsWith(MODAL_PREFIX);

export const handleButtonRoleContextModal = async (interaction) => {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.reply({ content: "你沒有 Manage Roles 權限。", flags: MessageFlags.Ephemeral });
        return;
    }

    const internalAllowed = await hasPermission({
        guildId: interaction.guildId ?? "global",
        userId: interaction.user.id,
        required: "admin",
    });
    if (!internalAllowed) {
        await interaction.reply({ content: "你的機器人權限不足（需要 admin）。", flags: MessageFlags.Ephemeral });
        return;
    }

    const payload = interaction.customId.slice(MODAL_PREFIX.length);
    const [channelId, messageId] = payload.split(":");
    if (!channelId || !messageId) {
        await interaction.reply({ content: "無效的綁定上下文。", flags: MessageFlags.Ephemeral });
        return;
    }

    const roleId = interaction.fields.getTextInputValue("role_id").trim();
    const label = interaction.fields.getTextInputValue("label").trim();
    const onceRaw = interaction.fields.getTextInputValue("once");

    if (!/^\d+$/.test(roleId)) {
        await interaction.reply({ content: "role_id 格式錯誤，請輸入純數字 ID。", flags: MessageFlags.Ephemeral });
        return;
    }

    if (!label) {
        await interaction.reply({ content: "label 不可為空。", flags: MessageFlags.Ephemeral });
        return;
    }

    let onceValue;
    try {
        onceValue = parseOnce(onceRaw);
    } catch (err) {
        await interaction.reply({ content: err.message, flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const role = await interaction.guild.roles.fetch(roleId);
        if (!role) throw new Error("找不到該角色");

        if (!canManageRole(interaction, role)) {
            throw new Error("我無法管理此角色，請確認機器人角色階層");
        }

        const appStore = useAppStore();
        const client = appStore.client;
        if (!client) throw new Error("client 尚未初始化");

        const channel = await interaction.client.channels.fetch(channelId);
        if (!channel?.isTextBased?.()) {
            throw new Error("目標訊息頻道不可用");
        }
        const message = await channel.messages.fetch(messageId);

        const { config } = await upsertButtonRoleBinding({
            client,
            guildId: interaction.guildId,
            channelId,
            messageId,
            roleId,
            label,
            once: onceValue,
        });

        await interaction.editReply(
            [
                "Context 綁定成功。",
                `messageId: ${message.id}`,
                `role: <@&${roleId}>`,
                `label: ${label}`,
                `once: ${config.options.once ? "on" : "off"}`,
                `link: ${message.url}`,
            ].join("\n"),
        );
    } catch (err) {
        await interaction.editReply(`設定失敗: ${err.message}`);
    }
};

export const BUTTON_ROLE_CONTEXT_NAME = "Bind Role Button";
export const BUTTON_ROLE_CONTEXT_PREFIX = CONTEXT_PREFIX;
