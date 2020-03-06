const core = require('@actions/core');
const github = require('@actions/github');

try {
  // Set up some variables
  let repoProjects = [];
  let projectCards = [];
  let cardIssues = [];

  // Set up some functions
  const getProjectFromRepo = async () => {
    console.log('Repo: ', github.context.repo);
  }

  // Get the Regex from the YAML
  const regexString = core.getInput('match-regex');
  const projectMatchRegex = new RegExp(regexString);

  // If it's not valid Regex, get outta here
  if (! projectMatchRegex) {
    core.setFailed(regexString + ' is not valid Regex, exiting.')
    return;
  }

  // Grab the project name from the payload
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  const payloadProject = payload;

  await getProjectFromRepo();

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
