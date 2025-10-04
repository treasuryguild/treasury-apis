# Discord Voice Attendance Logs API

This API allows you to fetch Discord voice channel attendance logs stored in Supabase. The API supports multi-server monitoring, allowing you to filter results by specific Discord servers (guilds).

## Authentication

This API requires authentication using an API key. Include the `api_key` header with your request:

```
api_key: YOUR_API_KEY
```

## Endpoint

```
GET /api/discord/voice-attendance-logs
```

## Headers

- `api_key` — Your API key for authentication (required)

## Query Parameters (optional)

- `user_id` — Filter by Discord user ID
- `channel_id` — Filter by Discord channel ID
- `guild_id` — Filter by Discord server (guild) ID
- `limit` — Limit the number of results (integer)

You can combine these parameters as needed.

## Example Requests

- **Fetch all logs (most recent first):**
  ```
  GET /api/discord/voice-attendance-logs
  Headers: api_key: YOUR_API_KEY
  ```

- **Fetch the 10 most recent logs:**
  ```
  GET /api/discord/voice-attendance-logs?limit=10
  Headers: api_key: YOUR_API_KEY
  ```

- **Fetch logs for a specific user:**
  ```
  GET /api/discord/voice-attendance-logs?user_id=123456789
  Headers: api_key: YOUR_API_KEY
  ```

- **Fetch logs for a specific channel:**
  ```
  GET /api/discord/voice-attendance-logs?channel_id=987654321
  Headers: api_key: YOUR_API_KEY
  ```

- **Fetch logs for a specific Discord server:**
  ```
  GET /api/discord/voice-attendance-logs?guild_id=111222333444555666
  Headers: api_key: YOUR_API_KEY
  ```

- **Fetch the 5 most recent logs for a user in a channel:**
  ```
  GET /api/discord/voice-attendance-logs?user_id=123456789&channel_id=987654321&limit=5
  Headers: api_key: YOUR_API_KEY
  ```

- **Fetch logs for a specific user in a specific server:**
  ```
  GET /api/discord/voice-attendance-logs?user_id=123456789&guild_id=111222333444555666
  Headers: api_key: YOUR_API_KEY
  ```

## Example Response

```
{
  "data": [
    {
      "username": "john_doe",
      "channel_name": "General",
      "guild_name": "Main Server",
      "recorded_at": 1733151584
    },
    {
      "username": "jane_smith",
      "channel_name": "Ambassador Events",
      "guild_name": "Community Server",
      "recorded_at": 1733151322
    }
    // ...more records
  ]
}
```

## Notes
- Results are ordered by `recorded_at` (newest first).
- The response includes `username`, `channel_name`, `guild_name`, and `recorded_at` fields for each record.
- The `recorded_at` field contains Unix timestamps (milliseconds since epoch).
- The `guild_name` field shows the Discord server name where the activity occurred.
- If no records match, `data` will be an empty array.
- This endpoint requires authentication with a valid API key.
- Invalid or missing API keys will return a 401 Unauthorized response.
- Use the `guild_id` parameter to filter results for a specific Discord server when monitoring multiple servers.

## Multi-Server Support

This API supports monitoring multiple Discord servers simultaneously. When your system is configured to monitor multiple servers:

- **All Servers**: Omit the `guild_id` parameter to get logs from all monitored servers
- **Specific Server**: Include `guild_id` to filter results for a single Discord server
- **Server Identification**: Each record includes the `guild_name` field to identify which server the activity occurred in

### Example Multi-Server Usage

```bash
# Get logs from all monitored servers
curl "https://your-domain.com/api/discord/voice-attendance-logs?limit=20" \
  -H "api_key: your-api-key"

# Get logs only from a specific server
curl "https://your-domain.com/api/discord/voice-attendance-logs?guild_id=123456789012345678&limit=20" \
  -H "api_key: your-api-key"

# Get logs for a specific user across all servers
curl "https://your-domain.com/api/discord/voice-attendance-logs?user_id=987654321098765432" \
  -H "api_key: your-api-key"

# Get logs for a specific user in a specific server
curl "https://your-domain.com/api/discord/voice-attendance-logs?user_id=987654321098765432&guild_id=123456789012345678" \
  -H "api_key: your-api-key"
``` 