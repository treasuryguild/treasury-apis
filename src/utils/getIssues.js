/*
import { Octokit } from "@octokit/rest";

const octokit = new Octokit(); // You can pass a PAT here if needed

let issues = [];

async function fetchIssues(org, repo) {
  try {
    const response = await octokit.rest.issues.listForRepo({
      owner: org,
      repo: repo,
      state: "all"
    });
    issues = response.data; // Issues are now stored in the 'issues' array
  } catch (error) {
    console.error('Error fetching issues:', error);
  }
}

export async function getIssues() {
  const org = 'SingularityNET-Archive';
  const repo = 'SingularityNET-Archive';
  await fetchIssues(org, repo);

  return issues;
}
*/

import axios from 'axios';

let issues = [];

async function fetchIssues(org, repo) {
  const url = `https://api.github.com/repos/${org}/${repo}/issues?state=all`;
  try {
    const response = await axios.get(url);
    issues = response.data; // Issues are now stored in the 'issues' array
  } catch (error) {
    console.error('Error fetching issues:', error);
  }
}

export async function getIssues() {
  const org = 'SingularityNET-Archive';
  const repo = 'SingularityNET-Archive';
  await fetchIssues(org, repo);

  return issues;
}
