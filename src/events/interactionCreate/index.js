import { Events, MessageFlags } from "discord.js"
import { useAppStore } from "@/store/app"
import { listReloadTargetNames } from "@/core/loader"
import { handleButtonRoleInteraction } from "@/core/buttonRoles"
import { handleHelpMenuInteraction, HELP_MENU_CUSTOM_ID } from "@/core/helpCenter"
import { handleButtonRoleContextModal, isButtonRoleContextModal } from "@/core/buttonRoleContext"

export const event = {
    name: Events.InteractionCreate,
    once: false,
}

export const action = async(interaction) => {
    if (isButtonRoleContextModal(interaction)) {
        try {
            await handleButtonRoleContextModal(interaction)
        } catch (err) {
            console.error("context modal 處理失敗:", err)
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "處理綁定表單時發生錯誤。", flags: MessageFlags.Ephemeral })
            } else {
                await interaction.reply({ content: "處理綁定表單時發生錯誤。", flags: MessageFlags.Ephemeral })
            }
        }
        return
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId !== HELP_MENU_CUSTOM_ID) return
        try {
            await handleHelpMenuInteraction(interaction)
        } catch (err) {
            console.error("help menu 處理失敗:", err)
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "處理說明選單時發生錯誤。", flags: MessageFlags.Ephemeral })
            } else {
                await interaction.reply({ content: "處理說明選單時發生錯誤。", flags: MessageFlags.Ephemeral })
            }
        }
        return
    }

    if (interaction.isButton()) {
        if (!interaction.customId.startsWith("br:role:")) return
        try {
            await handleButtonRoleInteraction(interaction)
        } catch (err) {
            console.error("button role 處理失敗:", err)
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "處理按鈕時發生錯誤。", flags: MessageFlags.Ephemeral })
            } else {
                await interaction.reply({ content: "處理按鈕時發生錯誤。", flags: MessageFlags.Ephemeral })
            }
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

    if (!action) {
        // 備註: 防止未註冊指令造成 runtime error
        await interaction.reply({
            content: `找不到指令處理器: ${interaction.commandName}`,
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    try {
        await action(interaction)
    } catch (err) {
        console.error(`執行指令失敗: ${interaction.commandName}`, err)
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '執行指令時發生錯誤。', flags: MessageFlags.Ephemeral })
        } else {
            await interaction.reply({ content: '執行指令時發生錯誤。', flags: MessageFlags.Ephemeral })
        }
    }
}

//client.once(Events.ClientReady, readyClient => {
//	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
//});
