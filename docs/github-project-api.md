# GitHub Project Details API Documentation

This API route fetches details for a GitHub Project (ProjectV2) using the GitHub GraphQL API. Depending on the provided parameters, it will query for either an organization-level project or a repository-level project. All requests require a valid API key.

---

## Authentication

Include the API key in the request headers:

```
api-key: YOUR_API_KEY
```

---

## HTTP Methods Supported

- **GET** – Pass parameters via the query string.
- **POST** – Pass parameters in the JSON body.

---

## Request Parameters

**Required Parameters (via Query String or JSON Body):**

- `owner` (string):  
  - For an organization-level project, this is the organization login.
  - For a repository-level project, this is the repository owner’s username.

- `projectNumber` (number):  
  The project number (must be convertible to an integer).

**Optional Parameters:**

- `isOrg` (string):  
  - Set to `"true"` to indicate an organization-level project.
  - If omitted or not `"true"`, the API treats the request as targeting a repository-level project.

- `repo` (string):  
  - **Required for repository-level projects.**
  - Represents the repository name.

---

## Example Requests

### 1. Fetch Organization-Level Project (GET)

```bash
curl -X GET "https://treasury-apis.netlify.app/api/github-project?owner=ORG_NAME&projectNumber=1&isOrg=true" \
  -H "api-key: YOUR_API_KEY"
```

### 2. Fetch Repository-Level Project (GET)

```bash
curl -X GET "https://treasury-apis.netlify.app/api/github-project?owner=USERNAME&repo=REPOSITORY_NAME&projectNumber=2" \
  -H "api-key: YOUR_API_KEY"
```

### 3. Fetch Organization-Level Project (POST)

```bash
curl -X POST "https://treasury-apis.netlify.app/api/github-project" \
  -H "api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "owner": "ORG_NAME",
        "projectNumber": 1,
        "isOrg": "true"
      }'
```

### 4. Fetch Repository-Level Project (POST)

```bash
curl -X POST "https://treasury-apis.netlify.app/api/github-project" \
  -H "api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "owner": "USERNAME",
        "repo": "REPOSITORY_NAME",
        "projectNumber": 2
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
  When required parameters (`owner`, `projectNumber`, or `repo` for repository-level projects) are missing.
  
  ```json
  { "error": "Missing owner or projectNumber." }
  ```
  
  or
  
  ```json
  { "error": "Missing repo for repository-level project." }
  ```

- **500 Internal Server Error:**  
  For any unexpected server errors or issues with the GitHub GraphQL API.

---

## Notes

- The API uses a GitHub GraphQL client initialized with a token from the `GITHUB_TOKEN` environment variable.
- The `api-key` header is validated against the value set in `SERVER_API_KEY`.
- The project data is processed to map field values by name, making it easier to consume on the client side.

Happy coding!
