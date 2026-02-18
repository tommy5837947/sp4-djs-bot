import { Events } from "discord.js"
import { syncButtonRoleMessages } from "@/core/buttonRoles"

export const event = {
    name: Events.ClientReady,
    once: true,
}

export const action = async (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    const result = await syncButtonRoleMessages(c)
    console.log(`button role 訊息同步完成, total=${result.total}, cleaned=${result.cleaned}`)
}

//client.once(Events.ClientReady, readyClient => {
//	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
//});
