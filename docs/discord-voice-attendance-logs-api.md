# Discord Voice Attendance Logs API

This API allows you to fetch Discord voice channel attendance logs stored in Supabase.

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

- **Fetch the 5 most recent logs for a user in a channel:**
  ```
  GET /api/discord/voice-attendance-logs?user_id=123456789&channel_id=987654321&limit=5
  Headers: api_key: YOUR_API_KEY
  ```

## Example Response

```
{
  "data": [
    {
      "username": "john_doe",
      "channel_name": "General",
      "recorded_at": 1733151584
    },
    {
      "username": "jane_smith",
      "channel_name": "Ambassador Events",
      "recorded_at": 1733151322
    }
    // ...more records
  ]
}
```

## Notes
- Results are ordered by `recorded_at` (newest first).
- Only `username`, `channel_name`, and `recorded_at` fields are returned for each record.
- The `recorded_at` field contains Unix timestamps (seconds since epoch).
- If no records match, `data` will be an empty array.
- This endpoint requires authentication with a valid API key.
- Invalid or missing API keys will return a 401 Unauthorized response. 