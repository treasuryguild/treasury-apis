// pages/api/discord/voice-attendees/save.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Client, GatewayIntentBits } from 'discord.js'
import { supabaseAdmin } from '../../../../lib/supabaseClient'

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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!DISCORD_TOKEN || !GUILD_ID) {
        return res.status(500).json({ error: 'Missing DISCORD_TOKEN or GUILD_ID' })
    }

    try {
        const bot = await initClient()
        const guild = await bot.guilds.fetch(GUILD_ID)
        const fullGuild = await guild.fetch()

        // Get voice states
        const voiceStates = fullGuild.voiceStates.cache
        const attendees = voiceStates.map((vs) => ({
            userId: vs.id,
            channelId: vs.channelId,
            username: vs.member?.user?.username || 'Unknown User',
            displayName: vs.member?.displayName || 'Unknown User',
            channelName: fullGuild.channels.cache.get(vs.channelId!)?.name || 'Unknown'
        }))

        // Filter attendees who are actually in voice channels (not just connected)
        const activeAttendees = attendees.filter(attendee => attendee.channelId && attendee.channelName !== 'Unknown')

        if (activeAttendees.length === 0) {
            console.log('🔇 No active voice attendees found')
            return res.status(200).json({
                message: 'No active voice attendees',
                savedCount: 0
            })
        }

        // Prepare data for Supabase insertion
        const recordsToInsert = activeAttendees.map(attendee => ({
            username: attendee.username,
            display_name: attendee.displayName,
            user_id: attendee.userId,
            channel_name: attendee.channelName,
            channel_id: attendee.channelId,
            recorded_at: new Date().toISOString()
        }))

        // Insert data into Supabase
        const { data, error } = await supabaseAdmin
            .from('discord_voice_attendance_logs')
            .insert(recordsToInsert)
            .select()

        if (error) {
            console.error('❌ Error inserting data into Supabase:', error)
            return res.status(500).json({
                error: 'Failed to save to Supabase',
                details: error.message
            })
        }

        console.log(`✅ Successfully saved ${recordsToInsert.length} voice attendance records to Supabase`)
        console.log('📊 Saved records:')
        recordsToInsert.forEach((record, index) => {
            console.log(`   ${index + 1}. ${record.display_name} (${record.username}) in ${record.channel_name}`)
        })

        res.status(200).json({
            message: 'Voice attendance data saved successfully',
            savedCount: recordsToInsert.length,
            records: data
        })

    } catch (err: any) {
        console.error('❌ Error in voice attendees save handler:', err)
        res.status(500).json({
            error: err.message || 'Internal Server Error'
        })
    }
} 