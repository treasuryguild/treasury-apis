// pages/api/discord/voice-attendees/save.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Client, GatewayIntentBits } from 'discord.js'
import { createClient } from '@supabase/supabase-js'

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const GUILD_ID = process.env.GUILD_ID
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create Supabase client with service role key
const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

let client: Client | null = null
let isReady = false

async function initClient() {
    if (client && isReady) return client

    console.log('🔄 Creating Discord client...')
    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates
        ]
    })

    console.log('🔄 Logging in to Discord...')
    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Discord login timeout after 30 seconds'))
        }, 30000)

        client!.once('ready', () => {
            clearTimeout(timeout)
            isReady = true
            console.log('✅ Discord bot logged in successfully')
            resolve()
        })

        client!.once('error', (error) => {
            clearTimeout(timeout)
            console.error('❌ Discord client error:', error)
            reject(error)
        })

        client!.login(DISCORD_TOKEN).catch((error) => {
            clearTimeout(timeout)
            console.error('❌ Discord login failed:', error)
            reject(error)
        })
    })

    return client!
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Set a timeout for the entire request
    const timeout = setTimeout(() => {
        console.error('❌ Request timeout after 60 seconds')
        if (!res.headersSent) {
            res.status(500).json({ error: 'Request timeout' })
        }
    }, 60000)

    try {
        if (req.method !== 'POST') {
            clearTimeout(timeout)
            return res.status(405).json({ error: 'Method not allowed' })
        }

        // Check for required environment variables
        if (!DISCORD_TOKEN) {
            console.error('❌ Missing DISCORD_TOKEN environment variable')
            clearTimeout(timeout)
            return res.status(500).json({ error: 'Missing DISCORD_TOKEN environment variable' })
        }

        if (!GUILD_ID) {
            console.error('❌ Missing GUILD_ID environment variable')
            clearTimeout(timeout)
            return res.status(500).json({ error: 'Missing GUILD_ID environment variable' })
        }

        if (!SUPABASE_URL) {
            console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
            clearTimeout(timeout)
            return res.status(500).json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL environment variable' })
        }

        if (!SUPABASE_SERVICE_ROLE_KEY) {
            console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
            clearTimeout(timeout)
            return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' })
        }

        try {
            console.log('🔄 Initializing Discord client...')
            const bot = await initClient()
            console.log('✅ Discord client initialized successfully')

            console.log('🔄 Fetching guild...')
            const guild = await bot.guilds.fetch(GUILD_ID)
            const fullGuild = await guild.fetch()
            console.log(`✅ Guild fetched: ${fullGuild.name}`)

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
                clearTimeout(timeout)
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
                clearTimeout(timeout)
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

            clearTimeout(timeout)
            res.status(200).json({
                message: 'Voice attendance data saved successfully',
                savedCount: recordsToInsert.length,
                records: data
            })

        } catch (err: any) {
            console.error('❌ Error in voice attendees save handler:', err)
            clearTimeout(timeout)
            res.status(500).json({
                error: err.message || 'Internal Server Error'
            })
        }
    } catch (err: any) {
        console.error('❌ Error in handler:', err)
        clearTimeout(timeout)
        res.status(500).json({
            error: err.message || 'Internal Server Error'
        })
    }
}