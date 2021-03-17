# Themis

> The Greek Lady of good counsel; personification of divine order, fairness, law, natural law, and custom.

A Github Action that allows users to define a rule that prevents Pull Requests from being merged based on various factors.

## v3 Usage

Version 3 adds two new paramters:

* `CHANGELOG_REGEX` is the Regex string you want to use when searching for changelog files. It can be a filename (`CHANGELOG.md`) or a folder (`changelogs/`).
* `ORG_LEVEL` is used in conjunction with `PROJECT_REGEX`, and determines whether to check an organisation's projects (TRUE) or a repo's projects (FALSE, default).

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
      uses: js-egton/themis@v3.13
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        PROJECT_REGEX: ^Regex Here$
        LABEL_REGEX: ^Regex Here$
        CHANGELOG_REGEX: changelogs/
        DEBUG_MODE: true
```

## v2 Usage

Version 2 adds a third `with` parameter, and renames `match-regex` as follows:

* `PROJECT_REGEX` is the Regex string you want to use for **valid** projects. The check will fail if the PR is not in a valid project.
* `LABEL_REGEX` is the Regex string you want to use for **invalid** labels. The check will fail if the PR contains a label that matches the Regex.

There is also a debugging flag, allowing you to see console output in the job:

* `DEBUG_MODE`, defaults to FALSE.

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
      uses: js-egton/themis@v2.12
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        PROJECT_REGEX: ^Regex Here$
        LABEL_REGEX: ^Regex Here$
        DEBUG_MODE: true
```

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
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        match-regex: ^Regex Here$
```
