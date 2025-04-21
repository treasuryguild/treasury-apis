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

// Helper to process and structure the project data (items, fields, title)
function processProjectData(project: any) {
  if (!project) {
    return { error: 'No project found' };
  }
  const { title, fields, items } = project;
  const processedItems = items.map((item: any) => {
    // Reduce fieldValues to map by field name
    const fieldValuesMap = item.fieldValues.nodes.reduce((acc: any, fieldValue: any) => {
      const fieldName = fieldValue?.field?.name;
      if (fieldName) {
        acc[fieldName] = fieldValue;
      }
      return acc;
    }, {});
    return { ...item.content, fieldValues: fieldValuesMap };
  });
  return { title, fields: fields.nodes, items: processedItems };
}

/**
 * Fetch project data for an organization with pagination.
 */
async function fetchProjectData(
  graphqlWithAuth: any,
  variables: any
) {
  // Fragment for shared parts of the query
  const PROJECT_FRAGMENT = `
    title
    fields(first: 20) {
      nodes {
        ... on ProjectV2FieldCommon {
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
        content {
          ... on Issue {
            title
            body
            number
            url
            createdAt
            updatedAt
            closedAt
            milestone {
              title
            }
            labels(first: 10) {
              nodes {
                name
              }
            }
            assignees(first: 30) {
              nodes {
                login
              }
            }
            state
            author {
              login
            }
          }
        }
        fieldValues(first: 10) {
          nodes {
            ... on ProjectV2ItemFieldNumberValue {
              field {
                ... on ProjectV2FieldCommon {
                  name
                }
              }
              number
            }
            ... on ProjectV2ItemFieldTextValue {
              field {
                ... on ProjectV2FieldCommon {
                  name
                }
              }
              text
            }
            ... on ProjectV2ItemFieldDateValue {
              field {
                ... on ProjectV2FieldCommon {
                  name
                }
              }
              date
            }
            ... on ProjectV2ItemFieldSingleSelectValue {
              field {
                ... on ProjectV2FieldCommon {
                  name
                }
              }
              name
            }
            ... on ProjectV2ItemFieldIterationValue {
              field {
                ... on ProjectV2FieldCommon {
                  name
                }
              }
              iterationId
            }
          }
        }
      }
    }
  `;

  // Organization-only query
  const query = `
    query ($orgName: String!, $projectNumber: Int!, $cursor: String) {
      organization(login: $orgName) {
        projectV2(number: $projectNumber) {
          ${PROJECT_FRAGMENT}
        }
      }
    }
  `;

  let allItems: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let projectTitle = '';
  let projectFields: any[] = [];

  while (hasNextPage) {
    // Fetch the paginated data using the current cursor
    const data: any = await graphqlWithAuth(query, { ...variables, cursor });
    const projectData = data?.organization?.projectV2;
    if (!projectData) {
      throw new Error('No project data found');
    }

    // Save title and fields on the first iteration
    if (!projectTitle) {
      projectTitle = projectData.title;
      projectFields = projectData.fields;
    }
    const items = projectData.items.nodes || [];
    allItems = allItems.concat(items);

    hasNextPage = projectData.items.pageInfo.hasNextPage;
    cursor = projectData.items.pageInfo.endCursor;
  }

  return { title: projectTitle, fields: projectFields, items: allItems };
}

// Unified API route handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    validateApiKey(req);

    // Read required parameters
    let { owner, projectNumber, status } = req.query;

    // Allow overriding via POST body
    if (req.method === 'POST') {
      const body = req.body;
      if (body.owner) owner = body.owner;
      if (body.projectNumber) projectNumber = body.projectNumber;
      if (body.status) status = body.status;
    }

    if (!owner || !projectNumber) {
      return res.status(400).json({ error: 'Missing owner or projectNumber.' });
    }
    const projectNum = parseInt(projectNumber as string, 10);
    const variables = { orgName: owner, projectNumber: projectNum };

    const rawProjectData = await fetchProjectData(graphqlWithAuth, variables);
    const processed = processProjectData(rawProjectData);

    // Apply filter if the "status" parameter is provided
    let filteredItems = processed.items;
    if (status) {
      // Filter tasks by checking if the "Status" field's name matches the requested filter value
      filteredItems = filteredItems.filter(
        (item: any) => item.fieldValues?.Status?.name === status
      );
    }

    return res.status(200).json({
      data: {
        title: processed.title,
        fields: processed.fields,
        items: filteredItems,
      },
    });
  } catch (err: any) {
    if (err.message === 'Invalid API key') {
      return res.status(401).json({ error: err.message });
    }
    console.error('Error in GitHub project details API:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
