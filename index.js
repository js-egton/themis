const core = require('@actions/core');
const github = require('@actions/github');
const Octokit = require("@octokit/action");

try {
  // Set up some variables
  let repoProjects = [];
  let projectCards = [];
  let cardIssues = [];
  const octokit = new Octokit({ auth: github.token });

  // Get the Regex from the YAML
  const regexString = core.getInput('match-regex');
  const projectMatchRegex = new RegExp(regexString);

  // If it's not valid Regex, get outta here
  if (! projectMatchRegex) {
    core.setFailed(regexString + ' is not valid Regex, exiting.')
    return;
  }

  const repoInfo = github.repository;

  const projectList = await octokit.request("GET /repos/:owner/:repo/projects", {
    owner: repoInfo.owner,
    repo: repoInfo.repo
  });

  console.log('projectList: ', projectList);

  // Grab the project name from the payload
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  const payloadProject = payload;

  console.log('Payload: ', payload);

  // Test the project name against the Regex we prepared earlier
  if (projectMatchRegex.test(payloadProject)) {

  } else {
    core.setFailed('PR must be in a valid sprint project to be merged.')
    return;
  }
} catch (error) {
  core.setFailed(error.message);
}
