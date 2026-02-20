import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { upsertButtonRoleBinding } from "@/core/buttonRoles";
import { useAppStore } from "@/store/app";

export const requiredPermission = "admin";

export const command = new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("建立按鈕身份組規則（支援 ephemeral 提示）")
    .addSubcommand((sub) =>
        sub
            .setName("create")
            .setDescription("建立新訊息並新增一個按鈕身份組")
            .addStringOption((option) =>
                option.setName("message").setDescription("要顯示的訊息內容").setRequired(true),
            )
            .addRoleOption((option) =>
                option.setName("role").setDescription("按下後派發的身分組").setRequired(true),
            )
            .addStringOption((option) =>
                option.setName("label").setDescription("按鈕顯示文字").setRequired(true),
            )
            .addStringOption((option) =>
                option
                    .setName("style")
                    .setDescription("訊息樣式（預設 embed）")
                    .setRequired(false)
                    .addChoices(
                        { name: "embed", value: "embed" },
                        { name: "plain", value: "plain" },
                    ),
            )
            .addChannelOption((option) =>
                option.setName("channel").setDescription("要發送訊息的頻道（不填則使用目前頻道）").setRequired(false),
            )
            .addBooleanOption((option) =>
                option.setName("once").setDescription("是否啟用單一身份組模式（預設關閉）").setRequired(false),
            ),
    )
    .addSubcommand((sub) =>
        sub
            .setName("bind")
            .setDescription("對既有訊息追加一個按鈕身份組")
            .addStringOption((option) =>
                option.setName("message_id").setDescription("目標訊息 ID 或訊息連結").setRequired(true),
            )
            .addRoleOption((option) =>
                option.setName("role").setDescription("按下後派發的身分組").setRequired(true),
            )
            .addStringOption((option) =>
                option.setName("label").setDescription("按鈕顯示文字").setRequired(true),
            )
            .addChannelOption((option) =>
                option.setName("channel").setDescription("訊息所在頻道（只填訊息 ID 時可選）").setRequired(false),
            )
            .addBooleanOption((option) =>
                option.setName("once").setDescription("是否啟用單一身份組模式（不填則沿用）").setRequired(false),
            ),
    );

const canManageRole = (ctx, role) => {
    const me = ctx.guild?.members?.me;
    if (!me) return false;
    return me.roles.highest.position > role.position;
};

const parseMessageRef = (value) => {
    const raw = String(value ?? "").trim();
    const linkMatch = raw.match(/discord(?:app)?\.com\/channels\/(\d+|@me)\/(\d+)\/(\d+)/);
    if (linkMatch) {
        return {
            channelId: linkMatch[2],
            messageId: linkMatch[3],
        };
    }
    return {
        channelId: null,
        messageId: raw,
    };
};

const normalizePanelText = (value) => String(value ?? "").replace(/\\n/g, "\n").trim();

const resolveGuildEmojiAlias = (guild, text) => {
    if (!guild) return text;
    // 支援把 :emoji_name: 轉為 <:emoji_name:id> 或 <a:emoji_name:id>
    return text.replace(/:([a-zA-Z0-9_]+):/g, (full, emojiName) => {
        const emoji = guild.emojis.cache.find((e) => e.name === emojiName);
        if (!emoji) return full;
        return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
    });
};

export const action = async (ctx) => {
    if (!ctx.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
        await ctx.reply({ content: "你沒有 Manage Roles 權限。", flags: MessageFlags.Ephemeral });
        return;
    }

    const sub = ctx.options.getSubcommand(true);
    const channelOption = ctx.options.getChannel("channel");
    const role = ctx.options.getRole("role", true);
    const label = ctx.options.getString("label", true);
    const style = ctx.options.getString("style") ?? "embed";
    const onceValue = ctx.options.getBoolean("once");

    if (!canManageRole(ctx, role)) {
        await ctx.reply({ content: "我無法管理這個身分組，請確認身分組階層。", flags: MessageFlags.Ephemeral });
        return;
    }

    if (label.length > 80) {
        await ctx.reply({ content: "按鈕文字長度不可超過 80。", flags: MessageFlags.Ephemeral });
        return;
    }

    await ctx.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const appStore = useAppStore();
        const client = appStore.client;
        if (!client) throw new Error("client 尚未初始化");

        let targetMessage;
        const effectiveOnce = sub === "create" ? (onceValue ?? false) : onceValue;
        let targetChannel = channelOption ?? ctx.channel;

        if (!targetChannel?.isTextBased?.()) {
            throw new Error("請選擇可發訊息的文字頻道");
        }

        if (sub === "create") {
            const raw = ctx.options.getString("message", true);
            const normalized = normalizePanelText(raw);
            const description = resolveGuildEmojiAlias(ctx.guild, normalized);
            if (style === "plain") {
                targetMessage = await targetChannel.send({
                    content: description || "請點選下方按鈕切換身份組。",
                    components: [],
                });
            } else {
                const panelEmbed = new EmbedBuilder()
                    .setColor(0x4f8cff)
                    .setDescription(description || "請點選下方按鈕切換身份組。")
                    .setFooter({ text: "點擊按鈕即可新增/移除身份組" });
                targetMessage = await targetChannel.send({ embeds: [panelEmbed], components: [] });
            }
        } else {
            const messageRef = ctx.options.getString("message_id", true);
            const parsed = parseMessageRef(messageRef);

            if (parsed.channelId) {
                targetChannel = await ctx.client.channels.fetch(parsed.channelId);
            }
            if (!targetChannel?.isTextBased?.()) {
                throw new Error("無法解析訊息所在頻道，請改貼完整訊息連結");
            }

            targetMessage = await targetChannel.messages.fetch(parsed.messageId);
        }

        const { config } = await upsertButtonRoleBinding({
            client,
            guildId: ctx.guildId,
            channelId: targetChannel.id,
            messageId: targetMessage.id,
            roleId: role.id,
            label,
            once: effectiveOnce ?? undefined,
        });

        await ctx.editReply(
            [
                "按鈕身份組設定完成。",
                `messageId: ${targetMessage.id}`,
                `role: <@&${role.id}>`,
                `label: ${label}`,
                `style: ${sub === "create" ? style : "沿用原訊息"}`,
                `once: ${config.options.once ? "on" : "off"}`,
                `link: ${targetMessage.url}`,
            ].join("\n"),
        );
    } catch (err) {
        await ctx.editReply(`設定失敗: ${err.message}`);
    }
};
