import { Events, MessageFlags } from "discord.js"
import { useAppStore } from "@/store/app"
import { listReloadTargetNames } from "@/core/loader"
import { handleButtonRoleInteraction } from "@/core/buttonRoles"
import { handleHelpMenuInteraction, HELP_MENU_CUSTOM_ID } from "@/core/helpCenter"
import { handleButtonRoleContextModal, isButtonRoleContextModal } from "@/core/buttonRoleContext"
import { getUserPermissionLevel, hasPermission } from "@/core/permissions"

export const event = {
    name: Events.InteractionCreate,
    once: false,
}

const safeErrorReply = async (interaction, text) => {
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: text, flags: MessageFlags.Ephemeral })
        } else {
            await interaction.reply({ content: text, flags: MessageFlags.Ephemeral })
        }
    } catch (replyErr) {
        console.error("回覆互動錯誤訊息失敗:", replyErr)
    }
}

export const action = async(interaction) => {
    if (isButtonRoleContextModal(interaction)) {
        try {
            await handleButtonRoleContextModal(interaction)
        } catch (err) {
            console.error("context modal 處理失敗:", err)
            await safeErrorReply(interaction, "處理綁定表單時發生錯誤。")
        }
        return
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId !== HELP_MENU_CUSTOM_ID) return
        try {
            await handleHelpMenuInteraction(interaction)
        } catch (err) {
            console.error("help menu 處理失敗:", err)
            await safeErrorReply(interaction, "處理說明選單時發生錯誤。")
        }
        return
    }

    if (interaction.isButton()) {
        if (!interaction.customId.startsWith("br:role:")) return
        try {
            await handleButtonRoleInteraction(interaction)
        } catch (err) {
            console.error("button role 處理失敗:", err)
            await safeErrorReply(interaction, "處理按鈕時發生錯誤。")
        }
        return
    }

    if (interaction.isAutocomplete()) {
        if (interaction.commandName !== "reload") return

        const focused = interaction.options.getFocused(true)
        if (focused.name !== "name") return

        const scope = interaction.options.getString("scope") ?? "all"
        try {
            const names = await listReloadTargetNames({ scope })
            const keyword = String(focused.value ?? "").toLowerCase()
            const filtered = names
                .filter((n) => n.toLowerCase().includes(keyword))
                .slice(0, 25)
                .map((n) => ({ name: n, value: n }))

            await interaction.respond(filtered)
        } catch (err) {
            console.error("reload autocomplete 失敗:", err)
            await interaction.respond([])
        }
        return
    }

    if(!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) return

    const appStore = useAppStore()
    const action = appStore.commandsActionMap.get(interaction.commandName)
    const commandMeta = appStore.commandMetaMap?.get(interaction.commandName)
    const requiredPermission = commandMeta?.requiredPermission ?? "user"

    if (!action) {
        // 備註: 防止未註冊指令造成 runtime error
        await interaction.reply({
            content: `找不到指令處理器: ${interaction.commandName}`,
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    const canUse = await hasPermission({
        guildId: interaction.guildId ?? "global",
        userId: interaction.user.id,
        required: requiredPermission,
    })
    if (!canUse) {
        const current = await getUserPermissionLevel({
            guildId: interaction.guildId ?? "global",
            userId: interaction.user.id,
        })
        await interaction.reply({
            content: `你沒有權限使用此指令。需要: ${requiredPermission}，目前: ${current}`,
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    try {
        await action(interaction)
    } catch (err) {
        console.error(`執行指令失敗: ${interaction.commandName}`, err)
        await safeErrorReply(interaction, "執行指令時發生錯誤。")
    }
}

//client.once(Events.ClientReady, readyClient => {
//	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
//});
