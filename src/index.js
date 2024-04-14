// Require the necessary discord.js classes
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'
import 'dotenv/config'
import express from 'express'
import logger from './utilities/logger.js'
const { TOKEN, PORT } = process.env

const port = PORT || 3000
const app = express()

app.use(express.json())
app.listen(port, async () => {
  console.log(`server is listening on port: ${port}`)
})

app.get('/', (req, res) => {
  res.send('Hello world')
})

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
})

client.on(Events.MessageCreate, (message) => {
  if (/.*怎.*麼.*會/.test(message.content.replaceAll('\n', ''))) {
    message.delete()
    // .then(() => {
    //   message.reply('你違反了規範！')
    // })
  }
})

client.login(TOKEN)
