# GitHub Project Status Update API Documentation

This API route updates the status field of tasks in a GitHub Project (ProjectV2) from one status to another. By default, it changes tasks from 'Audited' status to 'Archived' status, but this can be customized.

---

## Authentication

Include the API key in the request headers:

```http
api_key: YOUR_API_KEY
```

---

## HTTP Method

This API only supports **GET** requests. Parameters are passed via the query string.

---

## Request Parameters

**Required Parameters:**
- **`owner` (string):**  
  The organization login where the project is hosted.
- **`projectNumber` (number):**  
  The project number (must be convertible to an integer).

**Optional Parameters:**
- **`fromStatus` (string):**  
  The current status of tasks to be updated. Defaults to `"Audited"`.
- **`toStatus` (string):**  
  The new status to set for the tasks. Defaults to `"Archived"`.

**Parameter Location:**
- All parameters must be passed in the query string

---

## Important Notes About Project Setup

To use this API successfully, ensure that:

1. The project has a field named "Status" (case-sensitive)
2. Both the `fromStatus` and `toStatus` values exist as options in the Status field
3. The GitHub token has appropriate permissions to modify the project
4. The project is accessible to the authenticated user/organization

### GitHub Token Requirements

The API uses a server-side GitHub token (`GITHUB_TOKEN` environment variable) that must have:
- Read access to the organization and project
- Write access to update project item field values
- Appropriate scope permissions for GitHub Projects API

The token is not passed in the request - it's configured on the server side.

---

## Example Requests

### 1. Basic Request (Audited → Archived)
```bash
curl -X GET "https://treasury-apis.netlify.app/api/github/update-project-status?owner=ORG_NAME&projectNumber=1" \
  -H "api_key: YOUR_API_KEY"
```

### 2. Custom Status Update
```bash
curl -X GET "https://treasury-apis.netlify.app/api/github/update-project-status?owner=ORG_NAME&projectNumber=1&fromStatus=In%20Progress&toStatus=Completed" \
  -H "api_key: YOUR_API_KEY"
```

### 3. JavaScript/Node.js Example
```javascript
const response = await fetch('https://treasury-apis.netlify.app/api/github/update-project-status?owner=ORG_NAME&projectNumber=1&fromStatus=Audited&toStatus=Archived', {
  headers: {
    'api_key': 'YOUR_API_KEY'
  }
});

const result = await response.json();
console.log(result);
```

---

## Response Format

A successful response returns a JSON object containing the update results:

```json
{
  "message": "Successfully updated 5 items from 'Audited' to 'Archived'",
  "updatedCount": 5,
  "errorCount": 0,
  "updatedItems": [
    {
      "itemId": "PVTI_lAHO...",
      "title": "Task Title 1",
      "number": 123,
      "status": "success"
    },
    {
      "itemId": "PVTI_lAHO...",
      "title": "Task Title 2", 
      "number": 124,
      "status": "success"
    }
  ]
}
```

### Response with Errors
If some items fail to update, the response will include an `errors` array:

```json
{
  "message": "Successfully updated 3 items from 'Audited' to 'Archived'",
  "updatedCount": 3,
  "errorCount": 2,
  "updatedItems": [
    {
      "itemId": "PVTI_lAHO...",
      "title": "Task Title 1",
      "number": 123,
      "status": "success"
    }
  ],
  "errors": [
    {
      "itemId": "PVTI_lAHO...",
      "title": "Task Title 2",
      "number": 124,
      "error": "Status option 'Archived' not found in project"
    }
  ]
}
```

### No Items Found
If no items match the `fromStatus`:

```json
{
  "message": "No items found with status 'Audited'",
  "updatedCount": 0,
  "updatedItems": []
}
```

---

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- **401 Unauthorized:**  
  When the API key is missing or invalid.
  
  ```json
  { "error": "Invalid API key" }
  ```

- **400 Bad Request:**  
  When required parameters are missing or invalid.
  
  ```json
  { "error": "Missing required parameters: owner and projectNumber" }
  ```
  
  Or when projectNumber is not a valid number:
  
  ```json
  { "error": "projectNumber must be a valid number" }
  ```

- **405 Method Not Allowed:**  
  When using a method other than GET.
  
  ```json
  { "error": "Method not allowed. Use GET." }
  ```

- **500 Internal Server Error:**  
  For unexpected server errors, GitHub API issues, or project configuration problems.
  
  Common error messages include:
  - `"No project data found"` - When the project doesn't exist or isn't accessible
  - `"Status field not found in project"` - When the project doesn't have a "Status" field
  - `"Status option 'X' not found in project"` - When the target status doesn't exist
  - `"Could not retrieve status field options"` - When there's an issue fetching field options

---

## Rate Limiting and Performance

- The API processes items in batches and handles pagination automatically
- Projects with more than 100 items are handled through pagination (100 items per page)
- Each status update is performed individually to ensure data integrity
- Failed updates are reported but don't stop the processing of other items
- Consider GitHub's API rate limits when updating large numbers of items
- The API fetches all project items first, then filters and updates them

---

## Security Considerations

- This API performs write operations on GitHub projects
- Parameters are exposed in URLs - ensure appropriate access controls
- Ensure your GitHub token has appropriate project modification permissions
- Test with a small subset of items before running on production projects

---

## Notes

- The API uses GitHub's GraphQL API for efficient data retrieval and updates
- Status field names are case-sensitive and must match exactly
- The API validates that both source and target status options exist before attempting updates
- All operations are logged for debugging purposes
- The API handles large projects with pagination automatically

Happy coding!
