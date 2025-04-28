# System Registered Wallets API

## Endpoint
```
GET /api/getWallets
```

## Description
This endpoint retrieves wallet addresses and associated user information from the system's database. The data includes wallet addresses, usernames, full usernames, project information, and user IDs for system-registered users.

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
Returns an object containing a data array with the following fields:
- `wallet`: User's wallet address
- `username`: User's username
- `full_username`: User's full username
- `project`: Associated project information
- `user_id`: User's system ID

Example Response:
```json
{
  "data": [
    {
      "wallet": "addr1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "username": "user123",
      "full_username": "User Name",
      "project": "Project Name",
      "user_id": "user123"
    }
  ]
}
```

### Error Responses

#### 403 Forbidden
```json
{
  "error": "Forbidden"
}
```
Returned when the API key is missing or invalid.

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error"
}
```
Returned when there's a server-side error.

## Example Usage

### cURL
```bash
curl -X GET \
  'https://treasury-apis.netlify.app/api/getWallets' \
  -H 'api_key: your_api_key_here'
```

### JavaScript (Fetch)
```javascript
const response = await fetch('https://treasury-apis.netlify.app/api/getWallets', {
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

response = requests.get('https://treasury-apis.netlify.app/api/getWallets', headers=headers)
data = response.json()
```

## Rate Limiting
Please check with the API provider for any rate limiting policies.

## Support
For API access and support, please contact the API provider. 