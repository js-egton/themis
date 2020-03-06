const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/action");

async function getColumns(projectId) {
  return await octokit.request("GET /projects/:project_id/columns", {
    project_id: projectId,
    headers: {
      'accept': 'application/vnd.github.inertia-preview+json'
    }
  });
}

async function getCardIds(columnIds) {
  return await Promise.all(columnIds.map(
    columnId => {
      octokit.request("GET /projects/columns/:column_id/cards", {
        column_id: columnId,
        headers: {
          'accept': 'application/vnd.github.inertia-preview+json'
        }
      });
    }
  ));
}

async function run() {
  // Get Octokit running
  const octokit = new Octokit();

  try {
    // Get the Regex from the YAML
    const regexString = core.getInput('match-regex');
    const projectMatchRegex = new RegExp(regexString);

    // If it's not valid Regex, get outta here
    if (! projectMatchRegex) {
      core.setFailed(regexString + ' is not valid Regex, exiting.')
      return;
    }

    // Go find projects for this repo
    const repoInfo = github.context.repo;
    const projectList = await octokit.request("GET /repos/:owner/:repo/projects", {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      headers: {
        'accept': 'application/vnd.github.inertia-preview+json'
      }
    });

    // Filter them down by project names that match the Regex we were given
    let repoProjects = projectList.data.filter(project => projectMatchRegex.test(project.name)).map(project => project.id);

    // Then get the cards for all those valid projects
    let projectCards = [];
    repoProjects.forEach(projectId => {
      let columnsFromId = getColumns(projectId);

      // Got all the columns for this project, now we need cards
      const columnIds = columnsFromId.data.map(project => project.id);
      let cardsFromColumnId = getCardIds(columnIds);

      // We have all the cards from all the columns, put them together
      cardsFromColumnId.forEach(card => {
        projectCards = projectCards.concat(card.data)
      })
    });

    const payload = github.context.payload;

    // Pull the issue IDs out of the cards
    let issueUrl = payload.repository.issues_url;
    issueUrl = issueUrl.substring(0, issueUrl.length - ('{/number}').length);

    let cardIssues = [];
    projectCards.forEach((card) => {
      const match = card.indexOf(issueUrl)

      if (match !== -1) {
        cardIssues.push(card.substring(match + issueUrl.length + 1))
      }
    });

    // Get the current PR number from the payload
    const thisIssueNumber = payload.number;

    // If the PR issue is included in the big list of card IDs, we're good
    if (! cardIssues.includes(thisIssueNumber)) {
      core.setFailed('PR must be in a valid sprint project to be merged.')
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
