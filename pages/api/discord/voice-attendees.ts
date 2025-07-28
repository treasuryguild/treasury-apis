// pages/api/voice-attendees.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Client, GatewayIntentBits } from 'discord.js'

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const GUILD_ID = process.env.GUILD_ID

let client: Client | null = null
let isReady = false

async function initClient() {
    if (client && isReady) return client

    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates
        ]
    })

    await new Promise<void>((resolve, reject) => {
        client!.once('ready', () => {
            isReady = true
            console.log('✅ Discord bot logged in')
            resolve()
        })
        client!.login(DISCORD_TOKEN).catch(reject)
    })

    return client!
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!DISCORD_TOKEN || !GUILD_ID) {
        return res.status(500).json({ error: 'Missing DISCORD_TOKEN or GUILD_ID' })
    }

    try {
        const bot = await initClient()
        const guild = await bot.guilds.fetch(GUILD_ID)
        const fullGuild = await guild.fetch()

        // Note: We can't fetch members without GuildMembers intent, so we'll work with what we have
        const voiceStates = fullGuild.voiceStates.cache
        const attendees = voiceStates.map((vs) => ({
            userId: vs.id,
            channelId: vs.channelId,
            username: vs.member?.user?.username || 'Unknown User',
            displayName: vs.member?.displayName || 'Unknown User',
            channelName: fullGuild.channels.cache.get(vs.channelId!)?.name || 'Unknown'
        }))

        // Get voice channels with participants
        const voiceChannels = fullGuild.channels.cache.filter(ch => ch?.isVoiceBased())
        const channelInfo = []

        for (const [channelId, channel] of Array.from(voiceChannels.entries())) {
            if (!channel?.isVoiceBased()) continue

            const channelAttendees = attendees.filter(a => a.channelId === channelId)

            channelInfo.push({
                channelId: channel.id,
                channelName: channel.name,
                attendeeCount: channelAttendees.length,
                attendees: channelAttendees
            })
        }

        // Log detailed information about voice channels and participants
        console.log(`🎤 Voice Channel Analysis for Guild: ${guild.name}`)
        console.log(`📊 Total Voice Channels: ${channelInfo.length}`)
        console.log(`👥 Total Voice Participants: ${attendees.length}`)

        if (channelInfo.length > 0) {
            channelInfo.forEach((channel, index) => {
                console.log(`\n📢 Channel ${index + 1}: ${channel.channelName}`)
                console.log(`   👤 Participants: ${channel.attendeeCount}`)

                if (channel.attendees.length > 0) {
                    channel.attendees.forEach((attendee, attendeeIndex) => {
                        console.log(`   👤   ${attendeeIndex + 1}. ${attendee.displayName || attendee.username} (${attendee.userId})`)
                    })
                } else {
                    console.log(`   🔇   No participants currently in this channel`)
                }
            })
        } else {
            console.log(`🔇 No voice channels found in this guild`)
        }

        // Find the most active voice channel
        const mostActiveChannel = channelInfo.reduce((prev, current) =>
            (prev.attendeeCount > current.attendeeCount) ? prev : current
        )

        let connectionInfo = null
        if (mostActiveChannel && mostActiveChannel.attendeeCount > 0) {
            console.log(`\n🏆 Most Active Channel: ${mostActiveChannel.channelName}`)
            console.log(`   👥 Participants: ${mostActiveChannel.attendeeCount}`)

            connectionInfo = {
                channelId: mostActiveChannel.channelId,
                channelName: mostActiveChannel.channelName,
                status: 'monitoring',
                participantCount: mostActiveChannel.attendeeCount,
                timestamp: new Date().toISOString()
            }
        } else {
            console.log(`\n🔇 No active voice channels found`)
            connectionInfo = {
                status: 'no_active_channels',
                timestamp: new Date().toISOString()
            }
        }

        res.status(200).json({
            attendees,
            channels: channelInfo,
            connection: connectionInfo,
            summary: {
                totalAttendees: attendees.length,
                activeChannels: channelInfo.filter(ch => ch.attendeeCount > 0).length,
                totalChannels: channelInfo.length
            }
        })
    } catch (err: any) {
        console.error('Error fetching voice attendees:', err)
        res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
}
