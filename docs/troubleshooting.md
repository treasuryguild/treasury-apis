---
layout: default
title: Common Issues
nav_order: 7
---

# Common Issues and Troubleshooting

## Authentication Issues

### Invalid API Key
**Problem**: Receiving 403 Forbidden error
**Solution**: 
1. Verify your API key is correct
2. Check header format:
   - Use `api-key` for Contributors and Wallets APIs
   - Use `api-key` and `project-id` for Recognitions API
3. Contact andretreasuryguild if issues persist

### Missing Project ID
**Problem**: "Project ID is required" error
**Solution**:
1. Add `project-id` header
2. Use correct project ID for SNet Ambassador program: `722294ef-c9e4-4b2f-8779-a3f7caf4f28d`

## Data Issues

### No Data Found
**Problem**: Empty response or 404 error
**Solutions**:
1. Check date format (DD.MM.YY)
2. Verify contributor_id exists
3. Ensure subgroup name is exact match
4. Confirm wallet address format

### Incorrect Data Format
**Problem**: Data not in expected format
**Solution**:
1. Review response format in documentation
2. Check parsing logic in your code
3. Verify date formats in requests

## Request Issues

### CORS Errors
**Problem**: Cross-origin resource sharing errors
**Solution**:
1. Make requests from backend server
2. Don't expose API key in frontend code
3. Use appropriate proxy setup if needed

### Request Timeout
**Problem**: Request takes too long or times out
**Solution**:
1. Reduce date range in query
2. Add more specific filters
3. Implement request timeout handling
4. Cache frequently used data

## Best Practices to Avoid Issues

1. Implement proper error handling
2. Cache responses when appropriate
3. Use specific queries instead of fetching all data
4. Keep API keys secure
5. Monitor response times and errors
6. Maintain up-to-date documentation references