// scripts/discord-voice-monitor.js
const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_IDS = process.env.GUILD_IDS; // Comma-separated list of guild IDs
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

async function saveCurrentVoiceAttendees(bot, guildId) {
    try {
        const guild = await bot.guilds.fetch(guildId);
        const fullGuild = await guild.fetch();

        // Get voice states
        const voiceStates = fullGuild.voiceStates.cache;
        const attendees = voiceStates.map((vs) => ({
            userId: vs.id,
            channelId: vs.channelId,
            username: vs.member?.user?.username || 'Unknown User',
            displayName: vs.member?.displayName || 'Unknown User',
            channelName: fullGuild.channels.cache.get(vs.channelId)?.name || 'Unknown',
            guildId: guildId,
            guildName: fullGuild.name
        }));

        // Filter attendees who are actually in voice channels (not just connected)
        const activeAttendees = attendees.filter(attendee => attendee.channelId && attendee.channelName !== 'Unknown');

        if (activeAttendees.length === 0) {
            console.log(`🔇 No active voice attendees found in ${fullGuild.name} (${guildId})`);
            return 0;
        }

        // Prepare data for Supabase insertion
        const recordsToInsert = activeAttendees.map(attendee => ({
            username: attendee.username,
            display_name: attendee.displayName,
            user_id: attendee.userId,
            channel_name: attendee.channelName,
            channel_id: attendee.channelId,
            guild_id: attendee.guildId,
            guild_name: attendee.guildName,
            recorded_at: new Date().toISOString()
        }));

        // Insert data into Supabase
        const { error } = await supabaseAdmin
            .from('discord_voice_attendance_logs')
            .insert(recordsToInsert)
            .select();

        if (error) {
            console.error('❌ Error inserting data into Supabase:', error);
            throw new Error(`Failed to save to Supabase: ${error.message}`);
        }

        console.log(`✅ Saved ${recordsToInsert.length} voice attendance records from ${fullGuild.name} to Supabase`);
        recordsToInsert.forEach((record, index) => {
            console.log(`   ${index + 1}. ${record.display_name} (${record.username}) in ${record.channel_name}`);
        });

        return recordsToInsert.length;
    } catch (error) {
        if (error.code === 10004) {
            // Unknown Guild error - bot doesn't have access to this server
            console.log(`⚠️  Bot doesn't have access to guild ${guildId} (Unknown Guild). Skipping this server.`);
            return 0;
        } else if (error.code === 50001) {
            // Missing Access error
            console.log(`⚠️  Bot doesn't have access to guild ${guildId} (Missing Access). Skipping this server.`);
            return 0;
        } else {
            // Re-throw other errors
            console.error(`❌ Error accessing guild ${guildId}:`, error.message);
            throw error;
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function monitorVoiceChannels() {
    if (!DISCORD_TOKEN || !GUILD_IDS) {
        console.error('❌ Missing DISCORD_TOKEN or GUILD_IDS');
        process.exit(1);
    }

    // Parse comma-separated guild IDs
    const guildIds = GUILD_IDS.split(',').map(id => id.trim()).filter(id => id);
    if (guildIds.length === 0) {
        console.error('❌ No valid guild IDs provided');
        process.exit(1);
    }

    console.log(`🎯 Monitoring ${guildIds.length} Discord server(s): ${guildIds.join(', ')}`);

    const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 5 * 60 * 1000);

    try {
        const bot = await initClient();

        // Test access to all guilds first
        console.log('🔍 Testing access to all configured guilds...');
        const accessibleGuilds = [];
        const inaccessibleGuilds = [];

        for (const guildId of guildIds) {
            try {
                const guild = await bot.guilds.fetch(guildId);
                const fullGuild = await guild.fetch();
                accessibleGuilds.push({ id: guildId, name: fullGuild.name });
                console.log(`✅ Access confirmed: ${fullGuild.name} (${guildId})`);
            } catch (error) {
                if (error.code === 10004 || error.code === 50001) {
                    inaccessibleGuilds.push(guildId);
                    console.log(`❌ No access: Guild ${guildId} (${error.code === 10004 ? 'Unknown Guild' : 'Missing Access'})`);
                } else {
                    throw error; // Re-throw unexpected errors
                }
            }
        }

        console.log(`📊 Summary: ${accessibleGuilds.length} accessible, ${inaccessibleGuilds.length} inaccessible guilds`);
        
        if (accessibleGuilds.length === 0) {
            console.log('❌ No accessible guilds found. Please check bot permissions and guild IDs.');
            return {
                message: 'No accessible guilds found',
                savedCount: 0,
                monitoredGuilds: 0,
                accessibleGuilds: [],
                inaccessibleGuilds: inaccessibleGuilds
            };
        }

        // First sample across accessible guilds only
        let savedThisRun = 0;
        let totalSaved = 0;

        for (const guild of accessibleGuilds) {
            const guildSaved = await saveCurrentVoiceAttendees(bot, guild.id);
            savedThisRun += guildSaved;
            totalSaved += guildSaved;
        }

        // If there are attendees, keep polling every pollIntervalMs
        while (savedThisRun > 0) {
            console.log(`⏳ Attendees present in one or more servers. Polling again in ${Math.round(pollIntervalMs / 60000)} minutes...`);
            await sleep(pollIntervalMs);
            
            savedThisRun = 0;
            for (const guild of accessibleGuilds) {
                const guildSaved = await saveCurrentVoiceAttendees(bot, guild.id);
                savedThisRun += guildSaved;
                totalSaved += guildSaved;
            }
        }

        console.log(`🏁 No attendees detected in any accessible server. Exiting. Total records saved this run: ${totalSaved}`);
        return {
            message: 'Voice attendance monitoring completed',
            savedCount: totalSaved,
            monitoredGuilds: accessibleGuilds.length,
            accessibleGuilds: accessibleGuilds.map(g => g.name),
            inaccessibleGuilds: inaccessibleGuilds
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