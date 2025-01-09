[//]: # (Copyright © 2024 Perpetuator LLC)

# Concepts

## CLI First

This project uses a CLI first approach. The CLI is the primary interface for the user. After that IDEs etc. are used for
development, but you must be able to run any code generation or manipulation from the CLI.

# Git Merge

We are not currently paying for GitHub teams, so we are not enforcing rules on the repository. However, we should follow
the following rules:

- Only Linear History is allowed.
- Do not merge your own pull requests.

To merge for now we will use the following process:

1. Create a new branch from `main`.
2. Make your changes.
3. Push your branch to the repository.
4. Open a pull request.
5. Wait for a review.

When ready to merge:

```shell
git checkout main
git pull origin main
git merge --ff-only feature-branch
git push origin main
```

# Git Commits

## Generating new Versions

### Process

1. Commit changes
2. Make new release commit(s)
    1. Update the version in the `project.json` file
    2. Run the changelog script

### Example

Commit all changes.

```shell
git add .
git commit -m "Add new feature A" 
```

Check the last version:

```shell
git tag --sort=-creatordate | head -n 3
grep '"version":' ../package.json
```
 
Update version in `package.json`:

```shell
sed -i '' 's/"version": ".*"/"version": "0.15.0"/' ../package.json
grep '"version":' ../package.json
```

Update the changelog by running the script in the back-end repository:

```shell
cd ~/projects/capital-copilot-be-private
poetry run python -m scripts.update_changelog --repo-dir ~/projects/capital-copilot-fe-private 'v0.15.0' 'v0.14.0'
```

Review and update the new changelog entry to make sure it is correct.

Add the Git tag and push it to the repository.

```shell
git add .. && \
git commit -m "chore: bump version to 0.15.0" && \
git push origin main && \
git tag -a v0.15.0 -m "In this update, we've removed the charts feature (for now), added support for GraphQL file uploads, and introduced podcast image and description." && \
git push origin v0.15.0
```

Now open a pull request to merge it.

## Commit Message Format

A tribal rule in this project is to use this rule:
- Use imperative mood or present tense: "add feature" not "added feature" or "adds feature".
- Think to yourself: "This change will..." and complete the sentence.

Follow https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716

If and only if the change touches _production_ code it should be prefixed with `fix:` or `feat:`...
- feat: (new feature for the user, not a new feature for build script)
- fix: (bug fix for the user, not a fix to a build script)
- refactor: (refactoring production code, e.g. renaming a variable)

If the change does not touch _production_ code it should be prefixed with:
- docs: (changes to the documentation)
- style: (formatting, missing semi colons, etc; no production code change)
- test: (adding missing tests, refactoring tests; no production code change)
- chore: (updating grunt tasks etc; no production code change)

# Code Quality

...TBD
