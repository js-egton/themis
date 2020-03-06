# Themis

> The Greek Lady of good counsel; personification of divine order, fairness, law, natural law, and custom.

A Github Action that allows users to define a rule that prevents Pull Requests from being merged based on various factors.

## Installation

## Usage

Set up a workflow file referencing the Themis action, giving it a suitable name.

### `.github/workflows/main.yml`

```
on: [pull_request]

jobs:
  pr_match_job:
    runs-on: ubuntu-latest
    name: A job to validate PR is in a valid project
    steps:
    - name: Check PR is in project
      id: match
      uses: js-egton/themis@v1
      with:
        match-regex: ^/Project [\d]{2}/
```