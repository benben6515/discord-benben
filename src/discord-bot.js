import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'
import 'dotenv/config'
import { getCache, setCache } from './services/index.js'
import { chatWithOpenClaw } from './services/openclaw.js'
import logger from './utilities/logger.js'
import { exec } from 'child_process'

const { TOKEN, AUTHOR_ID, CHANNEL_ID, GUILD_ID, WHITE_LIST_STRING, ASSISTANT_CHANNEL_ID } = process.env

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
    const WHITE_LIST = WHITE_LIST_STRING.split(' ')
    if (![AUTHOR_ID, ...WHITE_LIST].includes(id)) {
      if (/.*怎.*麼.*會/.test(message.content.replaceAll('\n', ''))) {
        await message.reply(`
> ${message.content}

你違反了規範！`)
        await message.delete()
        return
      }
    }

    if (/[!|！]查詢等級排行/.test(message.content)) {
      const guild = client.guilds.cache.get(GUILD_ID)
      const fetchedMembers = await guild.members.fetch({ withPresences: true })
      const totalOnline = fetchedMembers.filter((member) => member)
      // console.log(totalOnline)
      const ids = Object.keys(chat)
      let data = []
      ids.forEach((id) => {
        const target = totalOnline.find((e) => e.id === id)
        data.push({ name: target?.nickname ?? target?.user?.globalName ?? '-', level: chat[id]?.level ?? 0 })
      })
      data = data.sort((a, b) => b.level - a.level)
      // console.log(Object.values(totalOnline).map((e) => e?.guild?.globalName ?? '0'))
      await message.reply(` ==== 聊天等級排行榜 ====
${data.map((e, i) => `${i < 3 ? '**' : ''}${e.name} : ${e.level} 等${i < 3 ? '**' : ''}`).join('\n')}
`)
    } else if (/[!|！]查詢等級/.test(message.content)) {
      const level = chat?.[id]?.level ?? 0
      await message.reply(`<@${id}> 您現在 ${level} 等了！`)
    } else if (/吃瓜/.test(message.content)) {
      await message.reply(`<@${AUTHOR_ID}> 吃瓜叫我！`)
    } else if (/[!|！]吃什麼/.test(message.content)) {
      const thinkingList = [' 嗯 ... 讓我想想 ...', ' 好問題！']
      const dinnerList = [' 炒飯 ', ' 什錦麵 ', ' 水餃 ', ' 牛排 ', ' 火鍋 ', '麥當勞']
      const result = thinkingList[Math.floor(Math.random() * thinkingList.length)]
      message.reply(result)
      setTimeout(
        () => {
          message.reply(dinnerList[Math.floor(Math.random() * dinnerList.length)])
        },
        Math.random() * 3000 + 1000,
      )
    } else if (/[!|！]vision/.test(message.content)) {
      // 圖片多語言翻譯功能 - 默認手機版
      const images = Array.from(message.attachments.values())

      if (images.length === 0) {
        await message.reply('請先傳送一張照片！📸')
        return
      }

      await message.channel.sendTyping()

      try {
        // 獲取第一張圖片 URL
        const imageUrl = images[0].url

        // 執行 vision_check.py 腳本（默認手機版）
        const scriptPath = './scripts/vision_check.py'
        const result = await new Promise((resolve, reject) => {
          exec(`python3 ${scriptPath} '${imageUrl}'`, (error, stdout, stderr) => {
            if (error) {
              logger.error('Vision script error:', error)
              logger.error('stderr:', stderr)
              reject(error)
            } else {
              resolve(stdout)
            }
          })
        })

        // 發送結果到 assistant channel
        const assistantChannelId = ASSISTANT_CHANNEL_ID || CHANNEL_ID
        const assistantChannel = client?.channels?.cache?.get(assistantChannelId)

        if (assistantChannel) {
          await message.reply({
            content: `** 🌏 圖片辨識結果** - 來自 @${message.author.username}\n\n\`\`\`\n${result}\n\`\`\``,
          })
          await message.react('✅')
        } else {
          throw new Error('找不到 assistant channel')
        }
      } catch (error) {
        logger.error('Vision error:', error)
        await message.reply(`❌ 處理失敗：${error.message}`)
        await message.react('❌')
      }
    } else if (/[!|！]ai(\s+.+)?/.test(message.content)) {
      const userMessage = message.content.replace(/[!|！]ai\s+/, '')
      const images = Array.from(message.attachments.values()).map((attachment) => attachment.url)
      try {
        await message.channel.sendTyping()
        const response = await chatWithOpenClaw({
          userId: id,
          message: userMessage,
          images,
          systemPrompt: 'You are a helpful AI assistant. Respond in Traditional Chinese unless requested otherwise.',
        })
        if (response.length > 2000) {
          const chunks = response.match(/.{1,2000}/g)
          for (const chunk of chunks) {
            await message.reply(chunk)
          }
        } else {
          await message.reply(response)
        }
      } catch (error) {
        logger.error('AI command error:', error)
        await message.reply(`AI 錯誤: ${error.message}`)
      }
    } else {
      await onChat({ id, chat, client })
    }
  })

  client.on(Events.MessageReactionAdd, (reaction, user) => onMessageReactionAdd(client, reaction, user))

  client.login(TOKEN)

  // === functions ===

  async function onChat({ id, chat, client }) {
    if (!chat?.[id]) chat[id] = { count: 0, level: 0 }
    chat[id].count += 1
    if (Math.random() < 0) {
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
  }
}

async function onMessageReactionAdd(client, reaction, user) {
  if (reaction.partial) {
    try {
      await reaction.fetch()
    } catch (error) {
      console.error('Something went wrong when fetching the message:', error)
      // Return as `reaction.message.author` may be undefined/null
      return
    }
  }

  try {
    // Bookmark
    if (reaction.emoji.name === '🔖') {
      const id = user.id
      const template = `
> 嗨！這是您收藏的訊息～

${reaction.message.content}
${reaction.message.url}
`
      await client.users.send(id, {
        content: template,
        files: Array.from(reaction.message.attachments.values()),
      })
    }
  } catch (error) {
    logger.error(error)
    if (error.code === 50007) {
      reaction.replay('我無法傳私訊給你，請調整權限後再試一次！')
    }
  }
}
