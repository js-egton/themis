# Themis

> The Greek Lady of good counsel; personification of divine order, fairness, law, natural law, and custom.

A Github Action that allows users to define a rule that prevents Pull Requests from being merged based on various factors.

## Usage

Set up a workflow file referencing the Themis action repo, giving it a suitable name.

You need two `with` parameters:

* `match-regex` is the Regex string you want to use for valid projects. For example, `^Project [\d]{2}$` will match 'Project 01' and 'Project 02' but not 'Project 3'. (You don't need the leading and trailing slash on the Regex string, just the tokens inside. I advise you use `^` and `$` string markers for best results.)
* `GITHUB_TOKEN` is what the action uses to authenticate against the Github API. It's automatically put into the `secrets` variable, so you just need to include the parameter **exactly as shown below**.

### `.github/workflows/main.yml`

```
on: [pull_request]

jobs:
  pr_match_job:
    runs-on: ubuntu-latest
    name: Project Check
    steps:
    - name: Check PR is in project
      id: match
      uses: js-egton/themis@v1.2
      with:
        match-regex: ^Regex Here$
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## v2 Usage

Version 2 adds a third `with` parameter, and renames `match-regex` as follows:

* `project-regex` is the Regex string you want to use for **valid** projects.
* `label-regex` is the Regex string you want to use for **invalid** labels. The check will fail if the PR contains a label that matches the Regex.

### `.github/workflows/main.yml`

```
on: [pull_request]

jobs:
  pr_match_job:
    runs-on: ubuntu-latest
    name: Merge Check
    steps:
    - name: Check PR matches merge criteria
      id: match
      uses: js-egton/themis@v2.0
      with:
        project-regex: ^Regex Here$
        label-regex: ^Regex Here$
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
