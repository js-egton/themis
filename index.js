const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/action");
const octokit = new Octokit();

const getProjects = async function(repoInfo, projectMatchRegex) {
  const projectList = await octokit.request("GET /repos/:owner/:repo/projects", {
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    headers: {
      'accept': 'application/vnd.github.inertia-preview+json'
    }
  });

  // Filter these down by project names that match the Regex we were given
  return projectList.data.filter(project => projectMatchRegex.test(project.name)).map(project => project.id);
}

const getCardIdsFromProjects = async function(repoProjects) {
  let cards = []

  // Get all the project columns
  for (let i = 0; i < repoProjects.length; i++) {
    let res = await octokit.request("GET /projects/:project_id/columns", {
      project_id: repoProjects[i],
      headers: {
        'accept': 'application/vnd.github.inertia-preview+json'
      }
    });

    // Got all the columns for this project, now we need cards
    const columnIds = res.data.map(project => project.id)

    res = await Promise.all(columnIds.map(
      columnId => octokit.request("GET /projects/columns/:column_id/cards", {
        column_id: columnId,
        headers: {
          'accept': 'application/vnd.github.inertia-preview+json'
        }
      })
    ));

    // We have all the cards from all the columns, put them together
    res.forEach(card => {
      cards = cards.concat(card.data)
    })

    return cards;
  }

  return cards.map(card => card.content_url)
}

async function run() {
  try {
    // Get the Regex from the YAML
    const regexString = core.getInput('match-regex');
    const projectMatchRegex = new RegExp(regexString);

    // If it's not valid Regex, get outta here
    if (! projectMatchRegex) {
      core.setFailed(regexString + ' is not valid Regex, exiting.')
      return;
    }

    // Go find projects for this repo that match our Regex
    const repoProjects = await getProjects(github.context.repo, projectMatchRegex);

    if (repoProjects.length < 1) {
      core.setFailed('No projects found that matched given Regex: ' + projectMatchRegex)
    }

    // Then get the cards for all those valid projects
    const projectCards = await getCardIdsFromProjects(repoProjects);

    if (projectCards.length < 1) {
      core.setFailed('No cards found for matching Projects: ' + repoProjects)
    }

    const payload = github.context.payload;

    // Pull the issue IDs out of the cards
    let cardIssues = [];
    let issueUrl = payload.repository.issues_url;
    issueUrl = issueUrl.substring(0, issueUrl.length - ('{/number}').length)

    for (let card of projectCards) {
      const match = card.indexOf(issueUrl)

      if (match !== -1) {
        cardIssues.push(card.substring(match + issueUrl.length + 1))
      }
    }

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
