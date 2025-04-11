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
 * Fetch all organization-level project boards.
 * These are projects created directly under the organization.
 */
async function fetchOrgProjects(graphqlWithAuth: any, orgName: string): Promise<any[]> {
  const ORG_PROJECTS_QUERY = `
    query ($orgName: String!, $cursor: String) {
      organization(login: $orgName) {
        projectsV2(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            number
            title
            updatedAt
            url
            closed
          }
        }
      }
    }
  `;
  let allOrgProjects: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  while (hasNextPage) {
    const data: any = await graphqlWithAuth(ORG_PROJECTS_QUERY, { orgName, cursor });
    const projectsData = data?.organization?.projectsV2;
    if (!projectsData) break;
    const projects = projectsData.nodes.map((proj: any) => ({
      ...proj,
      repoName: null, // Organization projects are not associated with a repository.
      source: 'org',
    }));
    allOrgProjects = allOrgProjects.concat(projects);
    hasNextPage = projectsData.pageInfo.hasNextPage;
    cursor = projectsData.pageInfo.endCursor;
  }
  return allOrgProjects;
}

/**
 * Fetch all repository-level project boards.
 * Iterates through the organization's repositories and returns any project boards within each repository.
 */
async function fetchRepoProjects(graphqlWithAuth: any, orgName: string): Promise<any[]> {
  const REPO_PROJECTS_QUERY = `
    query ($orgName: String!, $cursor: String) {
      organization(login: $orgName) {
        repositories(first: 50, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            name
            projectsV2(first: 20) {
              nodes {
                id
                number
                title
                updatedAt
                url
                closed
              }
            }
          }
        }
      }
    }
  `;
  let allRepoProjects: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  while (hasNextPage) {
    const data: any = await graphqlWithAuth(REPO_PROJECTS_QUERY, { orgName, cursor });
    const reposData = data?.organization?.repositories;
    if (!reposData) break;
    for (const repo of reposData.nodes) {
      if (repo.projectsV2 && repo.projectsV2.nodes && repo.projectsV2.nodes.length > 0) {
        const projects = repo.projectsV2.nodes.map((proj: any) => ({
          ...proj,
          repoName: repo.name,
          source: 'repo',
        }));
        allRepoProjects = allRepoProjects.concat(projects);
      }
    }
    hasNextPage = reposData.pageInfo.hasNextPage;
    cursor = reposData.pageInfo.endCursor;
  }
  return allRepoProjects;
}

/**
 * Unified API Route Handler
 * Accepts an organization name (orgName) via query parameters or POST body.
 * It returns a deduplicated array of project boards (from both organization and repository levels),
 * filtering out closed projects by default.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    validateApiKey(req);

    // Retrieve organization name from query or POST body
    let { orgName } = req.query;
    if (req.method === 'POST') {
      orgName = req.body.orgName || orgName;
    }
    if (!orgName) {
      return res.status(400).json({ error: 'Missing organization name (orgName).' });
    }
    
    // Fetch projects concurrently from both endpoints
    const [orgProjects, repoProjects] = await Promise.all([
      fetchOrgProjects(graphqlWithAuth, orgName as string),
      fetchRepoProjects(graphqlWithAuth, orgName as string),
    ]);
    
    // Merge both arrays of projects
    const allProjects = [...orgProjects, ...repoProjects];
    
    // Deduplicate projects by ID.
    // If the same board exists in both, prefer the repository-level version (with repoName populated).
    const uniqueProjectsMap: { [id: string]: any } = {};
    for (const project of allProjects) {
      if (!uniqueProjectsMap[project.id]) {
        uniqueProjectsMap[project.id] = project;
      } else {
        if (project.source === 'repo') {
          uniqueProjectsMap[project.id] = project;
        }
      }
    }
    const uniqueProjects = Object.values(uniqueProjectsMap);
    
    // Filter out closed projects by default
    const openProjects = uniqueProjects.filter((project: any) => !project.closed);

    return res.status(200).json({ data: openProjects });
  } catch (err: any) {
    if (err.message === 'Invalid API key') {
      return res.status(401).json({ error: err.message });
    }
    console.error('Error fetching project boards:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
