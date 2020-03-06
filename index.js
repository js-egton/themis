const core = require('@actions/core');
const Themis = require('./lib/themis');

try {
  Themis.validate();
} catch (error) {
  core.setFailed(error.message);
}
