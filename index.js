const core = require('@actions/core');
const github = require('@actions/github');
const { request } = require("@octokit/request");
const { graphql } = require("@octokit/graphql");

const requestWithAuth = request.defaults({
  headers: {
    accept: "application/vnd.github.v3+json",
    authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

const getLabelsOnIssue = async function(repoInfo, issueNumber) {
  try {
    const labelsList = await requestWithAuth("GET /repos/{owner}/{repo}/issues/{issue_number}/labels", {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      issue_number: issueNumber
    });

    return labelsList.data.map(label => label.name);
  } catch (err) {
    console.error('Unable to get labels: ', err);
  }
}

const getProjects = async function(repoInfo, debugMode, projectMatchRegex) {
  try {
    const projectList = await requestWithAuth("GET /repos/{owner}/{repo}/projects", {
      owner: repoInfo.owner,
      repo: repoInfo.repo
    });

    if (debugMode) {
      console.log('Result of GET /repos/' + repoInfo.owner + '/' + repoInfo.repo + '/projects:', projectList.data);
    }

    // Filter these down by project names that match the Regex we were given
    return projectList.data.filter(project => projectMatchRegex.test(project.name)).map(project => project.id);
  } catch (err) {
    console.error('Unable to get projects: ', err);
  }
}

const getOrgProjects = async function(repoInfo, debugMode, projectMatchRegex) {
  try {
    // const projectList = await requestWithAuth("GET /orgs/{org}/projects", {
    //   org: repoInfo.owner
    // });

    const { projectList } = await graphqlWithAuth(`
      {
        organization(login: "${repoInfo.owner}") {
          projectsNext(first: 20) {
            nodes {
              id
              title
            }
          }
        }
      }
    `);

    if (debugMode) {
      console.log('Result of GET /orgs/' + repoInfo.owner + '/projects:', projectList.data);
    }

    // Filter these down by project names that match the Regex we were given
    return projectList.data.filter(project => projectMatchRegex.test(project.title)).map(project => project.id);
  } catch (err) {
    console.error('Unable to get projects: ', err);
  }
}

const getCardIdsFromProjects = async function(repoProjects) {
  try {
    let cards = []

    // Get all the project columns
    for (let i = 0; i < repoProjects.length; i++) {
      // let res = await requestWithAuth("GET /projects/{project_id}/columns", {
      //   project_id: repoProjects[i]
      // });

      const { cardsInProject } = await graphqlWithAuth(`
        node(id: "${repoProjects[i]}") {
          ... on ProjectNext {
            items(first: 50) {
              nodes{
                title
                id
              }
            }
          }
        }
      `);

      // Got all the columns for this project, now we need cards
      const columnIds = cardsInProject.map(project => project.id)

      // res = await Promise.all(columnIds.map(
      //   columnId => requestWithAuth("GET /projects/columns/{column_id}/cards", {
      //     column_id: columnId
      //   })
      // ));

      // We have all the cards from all the columns, put them together
      cards = cards.concat(columnIds);
    }

    return cards;
  } catch (err) {
    console.error('Unable to get card IDs from project: ', err);
  }
}

// const getIssuesFromCards = async function(payload, projectCards) {
//   try {
//     let issues = [];

//     let issueUrl = payload.repository.issues_url;
//     issueUrl = issueUrl.substring(0, issueUrl.length - ('{/number}').length);

//     for (let card of projectCards) {
//       if (card) {
//         const match = card.indexOf(issueUrl)

//         if (match !== -1) {
//           // Need to turn this into an integer because the PR payload uses int
//           issues.push(parseInt(card.substring(match + issueUrl.length + 1)))
//         }
//       }
//     }

//     return issues;
//   } catch (err) {
//     console.error('Unable to get issues from cards: ', err);
//   }
// }

const getFilesOnCommit = async function(repoInfo, commitSha) {
  try {
    const commitDetails = await requestWithAuth("GET /repos/{owner}/{repo}/commits/{ref}", {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      ref: commitSha
    });

    if (commitDetails) {
      return commitDetails.data.files.map(file => file.filename);
    }
  } catch (err) {
    console.error('Unable to get files from commit: ', err);
  }
}

const checkProjectRegex = async function(regex, orgLevel, debugMode) {
  try {
    const projectMatchRegex = new RegExp(regex);

    // If it's not valid Regex, get outta here
    if (! projectMatchRegex) {
      core.setFailed(regexString + ' is not valid Regex, exiting.');
    }

    // Go find projects for this repo that match our Regex
    let repoProjects;

    if (orgLevel) {
      repoProjects = await getOrgProjects(github.context.repo, debugMode, projectMatchRegex);
    } else {
      repoProjects = await getProjects(github.context.repo, debugMode, projectMatchRegex);
    }

    if (debugMode) {
      console.log('List of projects matching Regex of ' + regex + ':', (repoProjects || 'none'));
    }

    if (repoProjects.length < 1) {
      core.setFailed('No projects found that matched given Regex: ' + projectMatchRegex);
      return;
    }

    // Then get the cards for all those valid projects
    const projectCards = await getCardIdsFromProjects(repoProjects);

    if (debugMode) {
      console.log('List of card IDs found in ' + repoProjects.length + ' valid project(s):', (projectCards || 'none'));
    }

    if (projectCards.length < 1) {
      core.setFailed('No cards found for matching Projects: ' + (repoProjects || null));
      return;
    }

    // // Pull the issue IDs out of the cards
    // const cardIssues = await getIssuesFromCards(github.context.payload, projectCards);

    // if (debugMode) {
    //   console.log('List of issue numbers extracted from ' + cardIssues.length + ' valid project card(s):', (cardIssues || 'none'));
    // }

    // if (cardIssues.length < 1) {
    //   core.setFailed('No issues found in Project Cards: ' + (projectCards || null));
    //   return;
    // }

    // Get the current PR number from the payload
    const thisIssueNumber = github.context.payload.number;

    // If the PR issue is included in the big list of card IDs, we're good
    if (! projectCards.includes(thisIssueNumber)) {
      core.setFailed('PR must be in a valid sprint project.')
    }
  } catch (err) {
    console.error('Unable to check project RegEx: ', err);
  }
}

const checkLabelRegex = async function(regex, debugMode) {
  try {
    const labelMatchRegex = new RegExp(regex);

    // If it's not valid Regex, get outta here
    if (! labelMatchRegex) {
      core.setFailed(regexString + ' is not valid Regex, exiting.');
    }

    const prLabels = await getLabelsOnIssue(github.context.repo, github.context.payload.number);

    if (debugMode) {
      console.log('List of labels found on PR #' + github.context.payload.number + ':', (prLabels || 'none'));
    }

    // If there's no labels, let this check go clean
    if (prLabels.length > 0) {
      prLabels.forEach((label) => {
        if (debugMode) {
          console.log('Testing label ' + label + ' against Regex of ' + regex);
        }

        if (labelMatchRegex.test(label)) {
          // Label matches given Regex, quit out
          core.setFailed('PR has ' + label + ' label attached.')
        }
      });
    }
  } catch (err) {
    console.error('Unable to check label RegEx: ', err);
  }
}

const checkForChangelog = async function(changelogRegex, debugMode) {
  try {
    if (debugMode) {
      console.log('Checking for ' + changelogRegex + ' file changes on SHA ' + github.context.sha);
    }

    const changedFiles = await getFilesOnCommit(github.context.repo, github.context.sha);

    if (debugMode) {
      console.log('List of changed files on SHA ' + github.context.sha + ': ' + changedFiles);
    }

    let changelogUpdated = false;
    const changelogRegexTester = new RegExp(changelogRegex);

    for (let file of changedFiles) {
      if (debugMode) {
        console.log('Testing filename ' + file + ' against Regex of ' + changelogRegex);
      }

      if (changelogRegexTester.test(file)) {
        if (debugMode) {
          console.log('Match found!');
        }
        // We got a match! Change the flag, quit out
        changelogUpdated = true;
        break;
      }
    }

    if(! changelogUpdated) {
      core.setFailed('Changelogs have not been updated on SHA ' + github.context.sha + '.')
    }
  } catch (err) {
    console.error('Unable to check changelogs RegEx: ', err);
  }
}

async function run() {
  try {
    // Get the Regex from the YAML
    const projectRegex = core.getInput('PROJECT_REGEX');
    const labelRegex = core.getInput('LABEL_REGEX');
    const changelogRegex = core.getInput('CHANGELOG_REGEX');
    const debugMode = core.getInput('DEBUG_MODE');
    const orgLevel = core.getInput('ORG_LEVEL');

    let debugModeFlag = false;
    let orgLevelFlag = false;

    if (debugMode && debugMode === 'true') {
      debugModeFlag = true;
    }

    if (orgLevel && orgLevel === 'true') {
      orgLevelFlag = true;
    }

    if (changelogRegex) {
      checkForChangelog(changelogRegex, debugModeFlag);
    }

    if (projectRegex) {
      checkProjectRegex(projectRegex, orgLevelFlag, debugModeFlag);
    }

    if (labelRegex) {
      checkLabelRegex(labelRegex, debugModeFlag);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
