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
  const apiKey = req.headers['api-key'];
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 4. Validate API key at the start
    validateApiKey(req);

    const { method } = req;
    let { owner, repo, projectNumber, isOrg } = req.query;

    // For POST, optionally read them from req.body
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
      // Organization-level project
      const query = `
        query ($orgName: String!, $projectNumber: Int!) {
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
              items(first: 100) {
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
      const processed = processProjectData(projectData);

      return res.status(200).json({ data: processed });
    } else {
      // Repository-level project
      if (!repo) {
        return res.status(400).json({ error: 'Missing repo for repository-level project.' });
      }

      const query = `
        query ($owner: String!, $repo: String!, $projectNumber: Int!) {
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
              items(first: 100) {
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
      const processed = processProjectData(projectData);

      return res.status(200).json({ data: processed });
    }
  } catch (err: any) {
    if (err.message === 'Invalid API key') {
      // Return a 401 if it's an invalid API key
      return res.status(401).json({ error: err.message });
    }
    console.error('Error in GitHub project details API:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
