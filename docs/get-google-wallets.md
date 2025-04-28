# Google Form Wallet Data API

## Endpoint
```
GET /api/getGWallets
```

## Description
This endpoint retrieves wallet addresses and associated Discord handles from a Google Sheet. The data is filtered to include only valid wallet addresses and Discord handles.

## Authentication
The API requires authentication using an API key header.

### Headers
- `api_key`: Your server API key (Required)

Example:
```
api_key: your_api_key_here
```

## Response Format

### Success Response (200 OK)
Returns an array of objects containing:
- `Timestamp`: When the entry was recorded
- `DiscordHandle`: User's Discord handle
- `WalletAddress`: User's wallet address
- `GitHubName`: User's GitHub username

Example Response:
```json
[
  {
    "Timestamp": "2024-01-01T12:00:00Z",
    "DiscordHandle": "user#1234",
    "WalletAddress": "addr1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "GitHubName": "githubusername"
  }
]
```

### Error Responses

#### 403 Forbidden
```json
{
  "error": "Forbidden"
}
```
Returned when the API key is missing or invalid.

#### 404 Not Found
```json
{
  "error": "No data found"
}
```
Returned when no data exists in the source or no valid entries were found.

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error"
}
```
Returned when there's a server-side error.

## Data Validation
The API implements the following validation rules:
- Wallet addresses must:
  - Start with "addr"
  - Be at least 55 characters long
- Both Discord handle and wallet address must be present
- Wallet addresses are trimmed to remove any extra spaces

## Example Usage

### cURL
```bash
curl -X GET \
  'https://treasury-apis.netlify.app/api/getGWallets' \
  -H 'api_key: your_api_key_here'
```

### JavaScript (Fetch)
```javascript
const response = await fetch('https://treasury-apis.netlify.app/api/getGWallets', {
  method: 'GET',
  headers: {
    'api_key': 'your_api_key_here'
  }
});

const data = await response.json();
```

### Python (Requests)
```python
import requests

headers = {
    'api_key': 'your_api_key_here'
}

response = requests.get('https://treasury-apis.netlify.app/api/getGWallets', headers=headers)
data = response.json()
```

## Rate Limiting
Please check with the API provider for any rate limiting policies.

## Support
For API access and support, please contact the API provider.