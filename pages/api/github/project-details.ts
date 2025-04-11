import type { NextApiRequest, NextApiResponse } from 'next';
import { graphql } from '@octokit/graphql';

// 1. Prepare a GitHub GraphQL client with token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${GITHUB_TOKEN}`,
  },
});

// 2. Define a helper to validate API key
function validateApiKey(req: NextApiRequest) {
  const apiKey = req.headers['api_key'];
  const validApiKey = process.env.SERVER_API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    throw new Error('Invalid API key');
  }
}

// 3. Helper to process the project data
function processProjectData(project: any) {
  if (!project) {
    return { error: 'No project found' };
  }

  const { fields, items } = project;
  const processedItems = items.nodes.map((item: any) => {
    const fieldValuesMap = item.fieldValues.nodes.reduce((acc: any, fieldValue: any) => {
      const fieldName = fieldValue?.field?.name;
      if (fieldName) {
        acc[fieldName] = fieldValue;
      }
      return acc;
    }, {});

    return {
      ...item.content,
      fieldValues: fieldValuesMap,
    };
  });

  return {
    title: project.title,
    fields: fields.nodes,
    items: processedItems,
  };
}

// Add this new function after the processProjectData function
async function fetchAllProjectItems(graphqlWithAuth: any, query: string, variables: any) {
  let allItems: any[] = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const data: any = await graphqlWithAuth(query, {
      ...variables,
      cursor,
    });

    const projectData = data?.organization?.projectV2 || data?.repository?.projectV2;
    const items = projectData?.items?.nodes || [];
    allItems = [...allItems, ...items];

    hasNextPage = projectData?.items?.pageInfo?.hasNextPage || false;
    cursor = projectData?.items?.pageInfo?.endCursor;
  }

  return allItems;
}

// Modify the handler function to use the new pagination
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    validateApiKey(req);

    const { method } = req;
    let { owner, repo, projectNumber, isOrg } = req.query;

    if (method === 'POST') {
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

    if (isOrg === 'true') {
      const query = `
        query ($orgName: String!, $projectNumber: Int!, $cursor: String) {
          organization(login: $orgName) {
            projectV2(number: $projectNumber) {
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
            }
          }
        }
      `;

      const data: any = await graphqlWithAuth(query, {
        orgName: owner,
        projectNumber: projectNum,
      });

      const projectData = data?.organization?.projectV2;
      const allItems = await fetchAllProjectItems(graphqlWithAuth, query, {
        orgName: owner,
        projectNumber: projectNum,
      });

      const processed = {
        title: projectData.title,
        fields: projectData.fields.nodes,
        items: allItems.map((item: any) => {
          const fieldValuesMap = item.fieldValues.nodes.reduce((acc: any, fieldValue: any) => {
            const fieldName = fieldValue?.field?.name;
            if (fieldName) {
              acc[fieldName] = fieldValue;
            }
            return acc;
          }, {});

          return {
            ...item.content,
            fieldValues: fieldValuesMap,
          };
        }),
      };

      return res.status(200).json({ data: processed });
    } else {
      if (!repo) {
        return res.status(400).json({ error: 'Missing repo for repository-level project.' });
      }

      const query = `
        query ($owner: String!, $repo: String!, $projectNumber: Int!, $cursor: String) {
          repository(owner: $owner, name: $repo) {
            projectV2(number: $projectNumber) {
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
            }
          }
        }
      `;

      const data: any = await graphqlWithAuth(query, {
        owner,
        repo,
        projectNumber: projectNum,
      });

      const projectData = data?.repository?.projectV2;
      const allItems = await fetchAllProjectItems(graphqlWithAuth, query, {
        owner,
        repo,
        projectNumber: projectNum,
      });

      const processed = {
        title: projectData.title,
        fields: projectData.fields.nodes,
        items: allItems.map((item: any) => {
          const fieldValuesMap = item.fieldValues.nodes.reduce((acc: any, fieldValue: any) => {
            const fieldName = fieldValue?.field?.name;
            if (fieldName) {
              acc[fieldName] = fieldValue;
            }
            return acc;
          }, {});

          return {
            ...item.content,
            fieldValues: fieldValuesMap,
          };
        }),
      };

      return res.status(200).json({ data: processed });
    }
  } catch (err: any) {
    if (err.message === 'Invalid API key') {
      return res.status(401).json({ error: err.message });
    }
    console.error('Error in GitHub project details API:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
