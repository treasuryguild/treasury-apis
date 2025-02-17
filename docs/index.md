---
layout: home
title: Home
nav_order: 1
permalink: /
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
  'api-key': 'your_server_api_key',
  'project-id': 'your_project_id'
}

// For Zoom Meetings API
headers: {
  'api-key': 'your_server_api_key'
}
```

⚠️ **Security Note**: Never expose your API key in client-side code. Always make API calls from your server.

## Quick Start Examples

Here are some quick examples to get you started with each API:

### 1. Contributors API

Fetch all contributors (Contributor id and wallet address):

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

Fetch all wallet addresses from Wallet Collector Google Form:

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
    'api-key': 'your_server_api_key',
    'project-id': 'your_project_id'
  }
});

const recognitions = await response.json();
```

### 4. Zoom Meetings API

Query zoom meetings with date filters:

```javascript
// Using fetch
const response = await fetch('https://treasury-apis.netlify.app/api/zoom-meetings?startDate=01.01.24&endDate=31.01.24', {
  method: 'GET',
  headers: {
    'api-key': 'your_server_api_key'
  }
});

const meetings = await response.json();
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

### Zoom Meetings API
- `startDate`: Start date for date range (format: DD.MM.YY)
- `endDate`: End date for date range (format: DD.MM.YY)
- `includeMissingData`: Include meetings with missing date information (default: true)

Example:
```javascript
/api/zoom-meetings?startDate=01.01.24&endDate=31.01.24&includeMissingData=true
```

## Response Formats

### Contributors API Response
```json
[
  {
    "contributor_id": "7xcueh",
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
  "recognitions": [
    {
      "recognition_id": "m0y7q3n81nzx-mmdfl0",
      "transaction_hash": "0202cae4ff851d7cee6e041a945b4b13b27aa1d7dbf77153da8bce1d8036f926",
      "transaction_timestamp": "1732017590927",
      "tx_type": "Outgoing",
      "tx_id": "565ebbc1-0b33-448e-ba81-56245ac0b618",
      "task_id": "m0y7q3n81nzx",
      "created_at": "2024-11-19T11:59:51.075998+00:00",
      "contributor_id": "mmdfl0",
      "task_name": "Participate in Marketing Guild 15.11.24",
      "date": "15.11.24",
      "label": [
        "Community Communication",
        "Coordination"
      ],
      "subGroup": "Marketing Guild",
      "taskCreator": "singularitynet",
      "amounts": {
        "MINS": "65"
      },
      "exchange_rate": "0.737"
    }
  ],
  "metadata": {
    "total": 1,
    "projectId": "722294ef-c9e4-4b2f-8779-a3f7caf4f28d",
    "appliedFilters": {
      "contributor_id": null,
      "subgroup": null,
      "task_name": null,
      "dateRange": {
        "startDate": null,
        "endDate": null
      }
    }
  }
}
```

### Zoom Meetings API Response
```json
{
  "meetings": [
    {
      "id": "123456789",
      "uuid": "abcd1234-efgh-5678-ijkl-mnopqrstuvwx",
      "topic": "Marketing Guild",
      "scheduled_start": "2024-01-15T10:00:00Z",
      "actual_start": "2024-01-15T10:02:15Z",
      "duration": 60,
      "total_participants": 8,
      "participants": [
        {
          "id": "04LJMnpnTc2IusLb5qv0ZQ",
          "user_id": "16778240",
          "name": "Ambassadors SingularityNET",
          "user_email": "singularitynetambassadors@gmail.com",
          "join_time": "2024-03-15T12:52:45.000Z",
          "leave_time": "2024-03-15T13:33:12.000Z",
          "duration": 2427,
          "registrant_id": "",
          "failover": false,
          "status": "in_meeting",
          "groupId": "",
          "internal_user": true
        }
      ]
    }
  ],
  "metadata": {
    "total": 1,
    "appliedFilters": {
      "dateRange": {
        "startDate": "01.01.24",
        "endDate": "31.01.24",
        "parsedStartDate": "2024-01-01T00:00:00.000Z",
        "parsedEndDate": "2024-01-31T23:59:59.999Z"
      },
      "includeMissingData": true
    },
    "summary": {
      "totalMeetings": 1,
      "totalParticipants": 8,
      "meetingsWithoutDates": 0,
      "meetingsWithoutParticipants": 0,
      "dateRange": {
        "earliest": "2024-01-15T10:02:15Z",
        "latest": "2024-01-15T10:02:15Z"
      }
    }
  }
}
```

## Error Handling

Our APIs use standard HTTP response codes:

| Code | Description |
|------|-------------|
| 200  | Success |
| 400  | Bad Request |
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

- Explore the [Contributors API](/treasury-apis/apis/contributors) documentation
- Learn about the [Wallets API](/treasury-apis/apis/wallets)
- Check out the [Recognitions API](/treasury-apis/apis/recognitions)
- Check out the [Zoom Meetings API](/treasury-apis/apis/zoom)

## Need Help?

If you need assistance:
- Check our [FAQ section](/treasury-apis/faq)
- Review [Common Issues](/treasury-apis/troubleshooting)
- [Contact our support team](/treasury-apis/contact)

Remember to replace placeholder values (your-domain.com, your_server_api_key) with your actual values when making requests.