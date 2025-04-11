# GitHub Project Details API Documentation

This API route fetches details for a GitHub Project (ProjectV2) using the GitHub GraphQL API. All requests require a valid API key.

---

## Authentication

Include the API key in the request headers:

```http
api_key: YOUR_API_KEY
```

---

## HTTP Methods Supported

The API supports both GET and POST methods for flexibility:

- **GET** – Recommended for testing and debugging. Parameters are passed via the query string.
- **POST** – Recommended for production use. Parameters are passed in the JSON body.

**Best Practices:**
- Use POST for production applications to keep parameters out of URLs
- Use GET for testing, debugging, or when building simple integrations
- Always include the API key in the headers regardless of the method used

---

## Request Parameters

**Required Parameters:**
- **`owner` (string):**  
  The organization login where the project is hosted.
- **`projectNumber` (number):**  
  The project number (must be convertible to an integer).

**Optional Parameters:**
- **`status` (string):**  
  Filters the project items by their status field value. Only returns items that match the specified status.  
  Example values: `"In Progress"`, `"Audited"`, `"Completed"`, etc.  
  The status value must exactly match the status field value in the project.

**Parameter Location:**
- For GET requests: Pass parameters in the query string
- For POST requests: Pass parameters in the JSON body

---

## Important Note About the Project Setup

To use this API, supply the following:

- The organization name (`owner`)
- The project number (`projectNumber`)

Optionally, you can filter the project items by providing the `status` parameter.

---

## Example Requests

### 1. GET Request (for testing/debugging)
```bash
curl -X GET "https://treasury-apis.netlify.app/api/github/project-details?owner=ORG_NAME&projectNumber=1" \
  -H "api_key: YOUR_API_KEY"
```

### 2. GET Request with Status Filter
```bash
curl -X GET "https://treasury-apis.netlify.app/api/github/project-details?owner=ORG_NAME&projectNumber=1&status=Audited" \
  -H "api_key: YOUR_API_KEY"
```

### 3. POST Request (recommended for production)
```bash
curl -X POST "https://treasury-apis.netlify.app/api/github/project-details" \
  -H "api_key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "owner": "ORG_NAME",
        "projectNumber": 1
      }'
```

### 4. POST Request with Status Filter
```bash
curl -X POST "https://treasury-apis.netlify.app/api/github/project-details" \
  -H "api_key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "owner": "ORG_NAME",
        "projectNumber": 1,
        "status": "Audited"
      }'
```

---

## Response Format

A successful response returns a JSON object containing the processed project data. For example:

```json
{
  "data": {
    "title": "Project Title",
    "fields": [
      { "name": "Field1", "dataType": "TEXT" },
      { "name": "Field2", "dataType": "NUMBER" }
      // ... additional fields
    ],
    "items": [
      {
        "title": "Issue Title",
        "body": "Issue body content...",
        "number": 123,
        "fieldValues": {
          "Field1": { "text": "Value1" },
          "Field2": { "number": 456 }
          // ... additional field values
        }
      }
      // ... additional items
    ]
  }
}
```

---

## Error Handling

The API returns appropriate HTTP status codes and error messages in case of issues:

- **401 Unauthorized:**  
  When the API key is missing or invalid.
  
  ```json
  { "error": "Invalid API key" }
  ```

- **400 Bad Request:**  
  When required parameters (`owner` or `projectNumber`) are missing.
  
  ```json
  { "error": "Missing owner or projectNumber." }
  ```

- **500 Internal Server Error:**  
  For any unexpected server errors or issues with the GitHub GraphQL API.

---

## Notes

- The API uses a GitHub GraphQL client initialized with a token from the `GITHUB_TOKEN` environment variable.
- The `api_key` header is validated against the value set in `SERVER_API_KEY`.
- The project data is processed to map field values by name, making it easier to consume on the client side.
- When using the `status` parameter, only items matching the specified status will be returned in the response.

Happy coding!