import { Client, GatewayIntentBits, Partials } from 'discord.js'
import vueInit from '@/core/vue'
import { loadCommands, loadEvents } from '@/core/loader'
import { useAppStore } from '@/store/app'
import dotenv from 'dotenv'
import { markRaw } from 'vue'

// 備註: 先讀取 .env，後續所有 process.env 才會有值
dotenv.config()

const bootstrap = async () => {
	vueInit()

	// Create a new client instance
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildMessageReactions,
		],
		partials: [
			Partials.Message,
			Partials.Channel,
			Partials.Reaction,
			Partials.User,
		],
	})

	const appStore = useAppStore()
	// 備註: discord.js 物件不可被 Vue/Pinia proxy，需 markRaw
	appStore.client = markRaw(client)

	// 備註: 等待指令/事件都載入完成後再登入，避免啟動競態
	await loadCommands()
	await loadEvents()

	// Log in to Discord with your client's token
	await client.login(process.env.TOKEN)
}

bootstrap().catch((err) => {
	console.error('Bot 啟動失敗:', err)
	process.exit(1)
})
