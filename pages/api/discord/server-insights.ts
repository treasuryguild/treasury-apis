// pages/api/discord/server-insights.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Client, GatewayIntentBits, ChannelType } from 'discord.js'

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const GUILD_ID = process.env.GUILD_ID

let client: Client | null = null
let isReady = false

async function initDiscordClient() {
    if (client && isReady) return client

    // Try with all intents first, fallback to basic intents if needed
    const intents = [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]

    client = new Client({ intents })

    await new Promise<void>((resolve, reject) => {
        client!.once('ready', () => {
            isReady = true
            console.log(`✅ Discord bot logged in as ${client!.user?.tag}`)
            resolve()
        })

        client!.login(DISCORD_TOKEN).catch((err) => {
            console.error('❌ Failed to login with privileged intents, trying with basic intents:', err.message)

            // Fallback to basic intents
            client = new Client({
                intents: [GatewayIntentBits.Guilds]
            })

            client.once('ready', () => {
                isReady = true
                console.log(`✅ Discord bot logged in with basic intents as ${client!.user?.tag}`)
                resolve()
            })

            client.login(DISCORD_TOKEN).catch((fallbackErr) => {
                console.error('❌ Failed to login Discord bot:', fallbackErr)
                reject(fallbackErr)
            })
        })
    })

    return client!
}

async function getMessageCounts(guild: any) {
    const messageCounts: { [userId: string]: { username: string, totalMessages: number, channelMessages: { [channelId: string]: number } } } = {}

    try {
        // Try to fetch all members
        const members = await guild.members.fetch()

        // Initialize message counts for all members
        members.forEach((member: any) => {
            messageCounts[member.id] = {
                username: member.user.username,
                totalMessages: 0,
                channelMessages: {}
            }
        })
    } catch (error) {
        console.warn('Could not fetch members, will use basic guild info:', error)
        // Fallback: we'll still try to get message data but with limited user info
    }

    // Get all text channels
    const textChannels = guild.channels.cache.filter((ch: any) => ch.type === ChannelType.GuildText)

    // Fetch messages from each channel (limited to last 100 messages per channel for performance)
    for (const [channelId, channel] of textChannels) {
        try {
            const messages = await channel.messages.fetch({ limit: 100 })

            messages.forEach((message: any) => {
                const userId = message.author.id
                const username = message.author.username

                if (!messageCounts[userId]) {
                    messageCounts[userId] = {
                        username: username,
                        totalMessages: 0,
                        channelMessages: {}
                    }
                }

                messageCounts[userId].totalMessages++
                messageCounts[userId].channelMessages[channelId] =
                    (messageCounts[userId].channelMessages[channelId] || 0) + 1
            })
        } catch (error) {
            console.warn(`Failed to fetch messages from channel ${channel.name}:`, error)
        }
    }

    return messageCounts
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!DISCORD_TOKEN || !GUILD_ID) {
        return res.status(500).json({ error: 'Missing DISCORD_TOKEN or GUILD_ID' })
    }

    try {
        const bot = await initDiscordClient()
        const guild = await bot.guilds.fetch(GUILD_ID)

        // Get basic guild information without member details
        const guildInfo = {
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount || 0,
            description: guild.description,
            createdAt: guild.createdAt,
            icon: guild.icon,
            ownerId: guild.ownerId
        }

        // Get basic channel information
        const channels = await guild.channels.fetch()
        const channelInfo = channels.map((ch) => ({
            id: ch?.id,
            name: ch?.name,
            type: ch?.type
        }))

        // Get message counts and user information
        const messageCounts = await getMessageCounts(guild)

        res.status(200).json({
            guild: guildInfo,
            channels: channelInfo,
            totalChannels: channels.size,
            members: messageCounts,
            totalMembers: Object.keys(messageCounts).length
        })
    } catch (err: any) {
        console.error('❌ Failed to get server insights:', err)
        res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
}
