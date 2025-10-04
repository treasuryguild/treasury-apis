// pages/api/voice-attendees.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Client, GatewayIntentBits } from 'discord.js'

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const GUILD_IDS = process.env.GUILD_IDS // Comma-separated list of guild IDs

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
    if (!DISCORD_TOKEN || !GUILD_IDS) {
        return res.status(500).json({ error: 'Missing DISCORD_TOKEN or GUILD_IDS' })
    }

    // Parse comma-separated guild IDs
    const guildIds = GUILD_IDS.split(',').map(id => id.trim()).filter(id => id);
    if (guildIds.length === 0) {
        return res.status(500).json({ error: 'No valid guild IDs provided' })
    }

    try {
        const bot = await initClient()
        const allAttendees = []
        const allChannels = []
        const guildSummaries = []

        // Process each guild
        for (const guildId of guildIds) {
            const guild = await bot.guilds.fetch(guildId)
            const fullGuild = await guild.fetch()

            // Note: We can't fetch members without GuildMembers intent, so we'll work with what we have
            const voiceStates = fullGuild.voiceStates.cache
            const attendees = voiceStates.map((vs) => ({
                userId: vs.id,
                channelId: vs.channelId,
                username: vs.member?.user?.username || 'Unknown User',
                displayName: vs.member?.displayName || 'Unknown User',
                channelName: fullGuild.channels.cache.get(vs.channelId!)?.name || 'Unknown',
                guildId: guildId,
                guildName: fullGuild.name
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
                    guildId: guildId,
                    guildName: fullGuild.name,
                    attendeeCount: channelAttendees.length,
                    attendees: channelAttendees
                })
            }

            // Log detailed information about voice channels and participants
            console.log(`🎤 Voice Channel Analysis for Guild: ${fullGuild.name} (${guildId})`)
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

            // Add to combined arrays
            allAttendees.push(...attendees)
            allChannels.push(...channelInfo)
            guildSummaries.push({
                guildId: guildId,
                guildName: fullGuild.name,
                totalAttendees: attendees.length,
                activeChannels: channelInfo.filter(ch => ch.attendeeCount > 0).length,
                totalChannels: channelInfo.length
            })
        }

        // Find the most active voice channel across all guilds
        const mostActiveChannel = allChannels.reduce((prev, current) =>
            (prev.attendeeCount > current.attendeeCount) ? prev : current, { attendeeCount: 0 }
        )

        let connectionInfo = null
        if (mostActiveChannel && mostActiveChannel.attendeeCount > 0) {
            console.log(`\n🏆 Most Active Channel: ${mostActiveChannel.channelName} in ${mostActiveChannel.guildName}`)
            console.log(`   👥 Participants: ${mostActiveChannel.attendeeCount}`)

            connectionInfo = {
                channelId: mostActiveChannel.channelId,
                channelName: mostActiveChannel.channelName,
                guildId: mostActiveChannel.guildId,
                guildName: mostActiveChannel.guildName,
                status: 'monitoring',
                participantCount: mostActiveChannel.attendeeCount,
                timestamp: new Date().toISOString()
            }
        } else {
            console.log(`\n🔇 No active voice channels found in any server`)
            connectionInfo = {
                status: 'no_active_channels',
                timestamp: new Date().toISOString()
            }
        }

        res.status(200).json({
            attendees: allAttendees,
            channels: allChannels,
            connection: connectionInfo,
            guilds: guildSummaries,
            summary: {
                totalAttendees: allAttendees.length,
                activeChannels: allChannels.filter(ch => ch.attendeeCount > 0).length,
                totalChannels: allChannels.length,
                monitoredGuilds: guildIds.length
            }
        })
    } catch (err: any) {
        console.error('Error fetching voice attendees:', err)
        res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
}
