---
layout: default
title: Getting Started
nav_order: 2
---

# Getting Started with Our APIs

This guide will help you get started with using our APIs. We'll cover authentication, basic usage, and provide examples for each API endpoint.

## Prerequisites

Before you begin, make sure you have:
- A server API key
- Basic knowledge of making HTTP requests
- A tool for making API requests (curl, Postman, or any HTTP client)

## Authentication

All API requests require authentication using an API key. Include your API key in the request headers:

```javascript
// For Contributors and Wallets APIs
headers: {
  'api_key': 'your_server_api_key'
}

// For Recognitions API
headers: {
  'x-api-key': 'your_server_api_key',
  'x-project-id': 'your_project_id'
}
```

⚠️ **Security Note**: Never expose your API key in client-side code. Always make API calls from your server.

## Quick Start Examples

Here are some quick examples to get you started with each API:

### 1. Contributors API

Fetch all contributors:

```javascript
// Using fetch
const response = await fetch('https://treasury-apis.netlify.app/api/contributors', {
  method: 'GET',
  headers: {
    'api_key': 'your_server_api_key'
  }
});

const contributors = await response.json();
```

### 2. Wallets API

Fetch all wallet addresses:

```javascript
// Using axios
const response = await axios.get('https://treasury-apis.netlify.app/api/getGWallets', {
  headers: {
    'api_key': 'your_server_api_key'
  }
});

const wallets = response.data;
```

### 3. Recognitions API

Query recognitions with filters:

```javascript
// Using fetch
const response = await fetch('https://treasury-apis.netlify.app/api/recognitions?contributor_id=jnaxjp&startDate=01.01.23&endDate=31.12.23', {
  method: 'GET',
  headers: {
    'x-api-key': 'your_server_api_key',
    'x-project-id': 'your_project_id'
  }
});

const recognitions = await response.json();
```

## Available Query Parameters

### Recognitions API
- `contributor_id`: Filter by specific contributor
- `startDate`: Start date for date range (format: DD.MM.YY)
- `endDate`: End date for date range (format: DD.MM.YY)
- `subgroup`: Filter by subgroup name
- `task_name`: Filter by specific task

Example:
```javascript
/api/recognitions?contributor_id=jnaxjp&subgroup=treasury guild
```

## Response Formats

### Contributors API Response
```json
[
  {
    "contributor_id": "123",
    "wallet": "addr1qxxxxxxxxx"
  }
]
```

### Wallets API Response
```json
[
  {
    "Timestamp": "2024-01-01T12:00:00Z",
    "DiscordHandle": "user#1234",
    "WalletAddress": "addr1qxxxxxxxxx"
  }
]
```

### Recognitions API Response
```json
{
  "metadata": {
    // metadata information
  },
  "recognitions": [
    {
      // recognition data
    }
  ]
}
```

## Error Handling

Our APIs use standard HTTP response codes:

| Code | Description |
|------|-------------|
| 200  | Success |
| 403  | Invalid or missing API key |
| 404  | Resource not found |
| 405  | Method not allowed |
| 500  | Internal server error |

Example error response:
```json
{
  "error": "Error message here"
}
```

## Rate Limiting

Currently, there are no strict rate limits in place, but please be mindful of your request frequency to ensure optimal service for all users.

## Testing Tools

We provide a Query Tester component that allows you to test different API endpoints and queries directly from our interface. You can find it at:

```
your-domain.com/query-tester
```

## Best Practices

1. **Caching**
   - Cache responses when appropriate
   - Implement exponential backoff for retries

2. **Error Handling**
   - Always handle potential errors in your requests
   - Implement proper fallbacks

3. **Security**
   - Never expose API keys in client-side code
   - Use HTTPS for all requests
   - Validate and sanitize input data

## Next Steps

- Explore the [Contributors API](/docs/api/contributors) documentation
- Learn about the [Wallets API](/docs/api/wallets)
- Check out the [Recognitions API](/docs/api/recognitions)
- View [Example Projects](/docs/examples)

## Need Help?

If you need assistance:
- Check our [FAQ section](/docs/faq)
- Review [Common Issues](/docs/troubleshooting)
- Contact our support team

Remember to replace placeholder values (your-domain.com, your_server_api_key) with your actual values when making requests.