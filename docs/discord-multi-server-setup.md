# Discord Multi-Server Voice Monitoring Setup

This guide explains how to configure your Discord voice monitoring system to track multiple Discord servers simultaneously.

## Overview

The system has been updated to support monitoring multiple Discord servers (guilds) at once. This is particularly useful when:
- You have multiple Discord servers with overlapping communities
- Users are active across different servers
- You want centralized monitoring of all your Discord voice activity

## Configuration Changes

### 1. GitHub Secrets Update

Update your GitHub repository secrets to use the new `GUILD_IDS` format:

**Old Configuration:**
```
GUILD_ID: 123456789012345678
```

**New Configuration:**
```
GUILD_IDS: 123456789012345678,987654321098765432,111222333444555666
```

**Steps:**
1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Update the `GUILD_IDS` secret with comma-separated guild IDs
4. Remove the old `GUILD_ID` secret if it exists

### 2. Database Migration

Run the SQL migration script to add guild support to your database:

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Run the contents of `docs/database-migration-multi-guild.sql`

This will add:
- `guild_id` column to store Discord server IDs
- `guild_name` column to store Discord server names
- Appropriate indexes for better query performance

### 3. Environment Variables

If you're running the script locally, update your environment variables:

```bash
# Old format
GUILD_ID=123456789012345678

# New format
GUILD_IDS=123456789012345678,987654321098765432,111222333444555666
```

## How It Works

### Monitoring Process

1. **Initialization**: The script parses the comma-separated `GUILD_IDS` string
2. **Multi-Server Polling**: For each monitoring cycle, the script:
   - Connects to each Discord server
   - Scans all voice channels in each server
   - Records active participants with server identification
3. **Continuous Monitoring**: The script continues polling as long as there's activity in ANY of the monitored servers
4. **Data Storage**: All records include `guild_id` and `guild_name` for server identification

### API Endpoints

The API endpoints have been updated to support guild filtering:

#### Voice Attendance Logs API
```
GET /api/discord/voice-attendance-logs?guild_id=123456789012345678
```

**Query Parameters:**
- `user_id`: Filter by specific user
- `channel_id`: Filter by specific channel
- `guild_id`: Filter by specific Discord server
- `limit`: Limit number of results

#### Voice Attendees API
```
GET /api/discord/voice-attendees
```

**Response includes:**
- `guilds`: Array of server summaries
- `attendees`: All attendees across all servers
- `channels`: All channels across all servers
- `summary`: Combined statistics

## Usage Examples

### Monitoring Multiple Servers

To monitor servers with IDs `123456789012345678`, `987654321098765432`, and `111222333444555666`:

```bash
GUILD_IDS=123456789012345678,987654321098765432,111222333444555666
```

### Querying Data by Server

Get voice attendance logs for a specific server:
```bash
curl "https://your-domain.com/api/discord/voice-attendance-logs?guild_id=123456789012345678&limit=50" \
  -H "api_key: your-api-key"
```

### Getting Cross-Server Statistics

The voice attendees API now returns data from all monitored servers:
```bash
curl "https://your-domain.com/api/discord/voice-attendees" \
  -H "api_key: your-api-key"
```

Response structure:
```json
{
  "attendees": [...],
  "channels": [...],
  "guilds": [
    {
      "guildId": "123456789012345678",
      "guildName": "Server 1",
      "totalAttendees": 5,
      "activeChannels": 2,
      "totalChannels": 10
    }
  ],
  "summary": {
    "totalAttendees": 8,
    "activeChannels": 3,
    "totalChannels": 25,
    "monitoredGuilds": 3
  }
}
```

## Benefits

1. **Centralized Monitoring**: Track voice activity across multiple Discord servers from one system
2. **Cross-Server Analytics**: Understand user behavior patterns across different communities
3. **Efficient Resource Usage**: Single bot instance monitors multiple servers
4. **Flexible Filtering**: Query data by specific servers, channels, or users
5. **Scalable**: Easy to add or remove servers by updating the `GUILD_IDS` configuration

## Troubleshooting

### Common Issues

1. **Bot Not in Server**: Ensure your Discord bot is added to all servers you want to monitor
2. **Permission Issues**: Verify the bot has necessary permissions in each server
3. **Invalid Guild IDs**: Double-check that all guild IDs are correct and comma-separated
4. **Database Errors**: Ensure the migration script has been run successfully

### Logs

The monitoring script provides detailed logs showing:
- Which servers are being monitored
- Activity detected in each server
- Cross-server statistics
- Any errors encountered

Example log output:
```
🎯 Monitoring 3 Discord server(s): 123456789012345678, 987654321098765432, 111222333444555666
✅ Saved 3 voice attendance records from Server 1 to Supabase
🔇 No active voice attendees found in Server 2 (987654321098765432)
✅ Saved 2 voice attendance records from Server 3 to Supabase
⏳ Attendees present in one or more servers. Polling again in 5 minutes...
```

## Migration from Single Server

If you're migrating from single-server monitoring:

1. **Backup your data** (optional but recommended)
2. **Run the database migration** script
3. **Update GitHub secrets** from `GUILD_ID` to `GUILD_IDS`
4. **Test the new configuration** with a manual workflow run
5. **Remove old `GUILD_ID` secret** once confirmed working

The system is backward compatible, so existing data will continue to work (though guild information will be null for old records).
