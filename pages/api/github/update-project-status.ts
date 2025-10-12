import type { NextApiRequest, NextApiResponse } from 'next';
import { graphql } from '@octokit/graphql';

// Configure the GitHub GraphQL client using the server token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `token ${GITHUB_TOKEN}` },
});

// Validate API key
function validateApiKey(req: NextApiRequest) {
  const apiKey = req.headers['api_key'];
  const validApiKey = process.env.SERVER_API_KEY;
  if (!apiKey || apiKey !== validApiKey) {
    throw new Error('Invalid API key');
  }
}

/**
 * Fetch all items from a project with their current status
 */
async function fetchProjectItems(
  graphqlWithAuth: any,
  orgName: string,
  projectNumber: number
) {
  const query = `
    query ($orgName: String!, $projectNumber: Int!, $cursor: String) {
      organization(login: $orgName) {
        projectV2(number: $projectNumber) {
          id
          title
          fields(first: 20) {
            nodes {
              ... on ProjectV2FieldCommon {
                id
                name
                dataType
              }
            }
          }
          items(first: 100, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              content {
                ... on Issue {
                  id
                  databaseId
                  title
                  number
                }
              }
              fieldValues(first: 10) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    field {
                      ... on ProjectV2FieldCommon {
                        id
                        name
                      }
                    }
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  let allItems: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let projectId = '';
  let statusFieldId = '';

  while (hasNextPage) {
    const data: any = await graphqlWithAuth(query, { orgName, projectNumber, cursor });
    const projectData = data?.organization?.projectV2;
    
    if (!projectData) {
      throw new Error('No project data found');
    }

    // Save project ID and find status field ID on first iteration
    if (!projectId) {
      projectId = projectData.id;
      const statusField = projectData.fields.nodes.find((field: any) => field.name === 'Status');
      if (!statusField) {
        throw new Error('Status field not found in project');
      }
      statusFieldId = statusField.id;
    }

    const items = projectData.items.nodes || [];
    allItems = allItems.concat(items);

    hasNextPage = projectData.items.pageInfo.hasNextPage;
    cursor = projectData.items.pageInfo.endCursor;
  }

  return { projectId, statusFieldId, items: allItems };
}

/**
 * Update the status of a project item
 */
async function updateItemStatus(
  graphqlWithAuth: any,
  projectId: string,
  itemId: string,
  fieldId: string,
  newStatus: string
) {
  const mutation = `
    mutation ($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $value }
      }) {
        projectV2Item {
          id
        }
      }
    }
  `;

  // First, we need to get the option ID for the new status
  const getOptionsQuery = `
    query ($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const optionsData: any = await graphqlWithAuth(getOptionsQuery, { projectId });
  const statusField = optionsData?.node?.fields?.nodes?.find((field: any) => field.id === fieldId);
  
  if (!statusField) {
    throw new Error('Could not retrieve status field options');
  }

  const targetOption = statusField.options.find((option: any) => option.name === newStatus);
  if (!targetOption) {
    throw new Error(`Status option '${newStatus}' not found in project`);
  }

  return await graphqlWithAuth(mutation, {
    projectId,
    itemId,
    fieldId,
    value: targetOption.id
  });
}

/**
 * API route handler for updating project task statuses
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    validateApiKey(req);

    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    // Read parameters from query string
    const { owner, projectNumber, fromStatus = 'Audited', toStatus = 'Archived' } = req.query;

    if (!owner || !projectNumber) {
      return res.status(400).json({ 
        error: 'Missing required parameters: owner and projectNumber' 
      });
    }

    const projectNum = parseInt(projectNumber as string, 10);
    if (isNaN(projectNum)) {
      return res.status(400).json({ 
        error: 'projectNumber must be a valid number' 
      });
    }

    // Fetch all project items
    const { projectId, statusFieldId, items } = await fetchProjectItems(
      graphqlWithAuth,
      owner as string,
      projectNum
    );

    // Filter items that have the 'fromStatus' status
    const itemsToUpdate = items.filter((item: any) => {
      const statusFieldValue = item.fieldValues.nodes.find(
        (fv: any) => fv.field?.name === 'Status'
      );
      return statusFieldValue?.name === (fromStatus as string);
    });

    if (itemsToUpdate.length === 0) {
      return res.status(200).json({
        message: `No items found with status '${fromStatus}'`,
        updatedCount: 0,
        items: []
      });
    }

    // Update each item's status
    const updateResults = [];
    const errors = [];

    for (const item of itemsToUpdate) {
      try {
        await updateItemStatus(
          graphqlWithAuth,
          projectId,
          item.id,
          statusFieldId,
          toStatus as string
        );
        
        updateResults.push({
          itemId: item.id,
          title: item.content?.title || 'Unknown',
          number: item.content?.number || 'Unknown',
          status: 'success'
        });
      } catch (error: any) {
        errors.push({
          itemId: item.id,
          title: item.content?.title || 'Unknown',
          number: item.content?.number || 'Unknown',
          error: error.message
        });
      }
    }

    return res.status(200).json({
      message: `Successfully updated ${updateResults.length} items from '${fromStatus}' to '${toStatus}'`,
      updatedCount: updateResults.length,
      errorCount: errors.length,
      updatedItems: updateResults,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err: any) {
    if (err.message === 'Invalid API key') {
      return res.status(401).json({ error: err.message });
    }
    console.error('Error in GitHub project status update API:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
