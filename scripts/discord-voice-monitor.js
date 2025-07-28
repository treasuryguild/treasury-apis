// scripts/discord-voice-monitor.js
const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

let client = null;
let isReady = false;

async function initClient() {
    if (client && isReady) return client;

    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates
        ]
    });

    await new Promise((resolve, reject) => {
        client.once('ready', () => {
            isReady = true;
            console.log('✅ Discord bot logged in');
            resolve();
        });
        client.login(DISCORD_TOKEN).catch(reject);
    });

    return client;
}

async function monitorVoiceChannels() {
    if (!DISCORD_TOKEN || !GUILD_ID) {
        console.error('❌ Missing DISCORD_TOKEN or GUILD_ID');
        process.exit(1);
    }

    try {
        const bot = await initClient();
        const guild = await bot.guilds.fetch(GUILD_ID);
        const fullGuild = await guild.fetch();

        // Get voice states
        const voiceStates = fullGuild.voiceStates.cache;
        const attendees = voiceStates.map((vs) => ({
            userId: vs.id,
            channelId: vs.channelId,
            username: vs.member?.user?.username || 'Unknown User',
            displayName: vs.member?.displayName || 'Unknown User',
            channelName: fullGuild.channels.cache.get(vs.channelId)?.name || 'Unknown'
        }));

        // Filter attendees who are actually in voice channels (not just connected)
        const activeAttendees = attendees.filter(attendee => attendee.channelId && attendee.channelName !== 'Unknown');

        if (activeAttendees.length === 0) {
            console.log('🔇 No active voice attendees found');
            return {
                message: 'No active voice attendees',
                savedCount: 0
            };
        }

        // Prepare data for Supabase insertion
        const recordsToInsert = activeAttendees.map(attendee => ({
            username: attendee.username,
            display_name: attendee.displayName,
            user_id: attendee.userId,
            channel_name: attendee.channelName,
            channel_id: attendee.channelId,
            recorded_at: new Date().toISOString()
        }));

        // Insert data into Supabase
        const { data, error } = await supabaseAdmin
            .from('discord_voice_attendance_logs')
            .insert(recordsToInsert)
            .select();

        if (error) {
            console.error('❌ Error inserting data into Supabase:', error);
            throw new Error(`Failed to save to Supabase: ${error.message}`);
        }

        console.log(`✅ Successfully saved ${recordsToInsert.length} voice attendance records to Supabase`);
        console.log('📊 Saved records:');
        recordsToInsert.forEach((record, index) => {
            console.log(`   ${index + 1}. ${record.display_name} (${record.username}) in ${record.channel_name}`);
        });

        return {
            message: 'Voice attendance data saved successfully',
            savedCount: recordsToInsert.length,
            records: data
        };

    } catch (err) {
        console.error('❌ Error in voice attendees monitoring:', err);
        throw err;
    } finally {
        if (client) {
            client.destroy();
        }
    }
}

// Run the monitoring if this script is executed directly
if (require.main === module) {
    monitorVoiceChannels()
        .then(result => {
            console.log('🎉 Voice monitoring completed successfully:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Voice monitoring failed:', error);
            process.exit(1);
        });
}

module.exports = { monitorVoiceChannels }; 