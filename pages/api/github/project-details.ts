import type { NextApiRequest, NextApiResponse } from 'next';
import { graphql } from '@octokit/graphql';

// 1. Configure the GitHub GraphQL client using the server token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `token ${GITHUB_TOKEN}` },
});

// 2. Validate API key
function validateApiKey(req: NextApiRequest) {
  const apiKey = req.headers['api_key'];
  const validApiKey = process.env.SERVER_API_KEY;
  if (!apiKey || apiKey !== validApiKey) {
    throw new Error('Invalid API key');
  }
}

// 3. A helper to process and structure the project data (items, fields, title)
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
 * 4. Fetch project data (both organization and repository) with pagination
 */
async function fetchProjectData(
  graphqlWithAuth: any,
  isOrg: boolean,
  variables: any
) {
  // Define a fragment that holds the shared parts of the query
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

  // Build the full query based on the type (organization or repository)
  const query = isOrg
    ? `
      query ($orgName: String!, $projectNumber: Int!, $cursor: String) {
        organization(login: $orgName) {
          projectV2(number: $projectNumber) {
            ${PROJECT_FRAGMENT}
          }
        }
      }
    `
    : `
      query ($owner: String!, $repo: String!, $projectNumber: Int!, $cursor: String) {
        repository(owner: $owner, name: $repo) {
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
    // Note: the same query is used with a different cursor for pagination.
    const data: any = await graphqlWithAuth(query, { ...variables, cursor });
    const projectData = isOrg
      ? data?.organization?.projectV2
      : data?.repository?.projectV2;
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

// 5. The unified API route handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    validateApiKey(req);
    let { owner, repo, projectNumber, isOrg } = req.query;

    // Allow overriding via POST body
    if (req.method === 'POST') {
      const body = req.body;
      if (body.owner) owner = body.owner;
      if (body.repo) repo = body.repo;
      if (body.projectNumber) projectNumber = body.projectNumber;
      if (body.isOrg !== undefined) isOrg = body.isOrg;
    }

    if (!owner || !projectNumber) {
      return res.status(400).json({ error: 'Missing owner or projectNumber.' });
    }
    const projectNum = parseInt(projectNumber as string, 10);
    const useOrg = isOrg === 'true';

    // Define variables based on the type
    const variables = useOrg
      ? { orgName: owner, projectNumber: projectNum }
      : { owner, repo, projectNumber: projectNum };

    const rawProjectData = await fetchProjectData(graphqlWithAuth, useOrg, variables);
    const processed = processProjectData(rawProjectData);
    return res.status(200).json({ data: processed });
  } catch (err: any) {
    if (err.message === 'Invalid API key') {
      return res.status(401).json({ error: err.message });
    }
    console.error('Error in GitHub project details API:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
