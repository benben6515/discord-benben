import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'
import 'dotenv/config'
import { getCache, setCache } from './services/index.js'
import logger from './utilities/logger.js'

const { TOKEN, AUTHOR_ID, CHANNEL_ID } = process.env

let timer = null
function setCacheDebounce(key = 'chat', data = {}) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    setCache(key, data)
  }, 5000)
}

export function initDiscordBot() {
  let chat = {}
  // Create a new client instance
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  })

  client.on(Events.ClientReady, (c) => {
    logger.info(`Ready! Logged in as ${c.user.tag}`)
    chat = getCache('chat')
    if (!chat) chat = {}
    console.log(chat)
  })

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return
    const id = message.author.id
    if (![AUTHOR_ID].includes(id)) {
      if (/.*怎.*麼.*會/.test(message.content.replaceAll('\n', ''))) {
        await message.reply('你違反了規範！')
        await message.delete()
        return
      }
    }

    if (/[!|！]查詢等級/.test(message.content)) {
      const level = chat[id].level
      await message.reply(`<@${id}> 您現在 ${level} 等了！`)
    } else {
      await onChat({ id, chat, client })
    }
  })

  client.login(TOKEN)

  // functions
  async function onChat({ id, chat, client }) {
    if (!chat?.[id]) chat[id] = { count: 0, level: 0 }
    chat[id].count += 1
    if (Math.random() < 0.1) {
      chat[id].level += 1
      if (id === AUTHOR_ID) chat[id].level += 10 + Math.floor(Math.random() * 100)
      const channelId = CHANNEL_ID
      const channel = client?.channels?.cache?.get(channelId)
      if (!channel) throw new Error('查詢不到此頻道！')
      const list = ['一直講幹話', '一直吃批薩', '無緣無故地', '怎麼會']
      const item = list[Math.floor(Math.random() * list.length)]
      const template = `<@${id}> ${item} 升到了 ${chat[id].level} 級了！`
      await channel?.send(template)
    }
    setCacheDebounce('chat', chat)
    console.log(chat)
  }
}
