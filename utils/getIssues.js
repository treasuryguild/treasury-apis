import axios from 'axios';

let issues = [];
let projects = [];

async function fetchIssues(org, repo) {
  const url = `https://api.github.com/repos/${org}/${repo}/issues?state=all`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });
    issues = response.data;
  } catch (error) {
    console.error('Error fetching issues:', error);
  }
}

async function fetchOrgProjects(org) {
  const url = `https://api.github.com/orgs/${org}/repos`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.inertia-preview+json', 
      },
    });
    projects = response.data;
  } catch (error) {
    console.error('Error fetching projects:', error);
  }
}

export async function getIssues() {
  const org = 'SingularityNET-Archive';
  const repo = 'SingularityNET-Archive';
  await fetchIssues(org, repo);
  await fetchOrgProjects(org);
  console.log('Fetched Projects:', projects);
  return issues;
}
