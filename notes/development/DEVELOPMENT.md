[//]: # (Copyright © 2024 Perpetuator LLC)

# TODO

Auto-formatter needs to be run as part of commit/push process.

Replace `src/app/redeem-gift-code-dialog.component.ts` with SCSS
```
          style="color: #ff4a4a;font-size: 13px;margin-top: 0;position: relative;top: -12px;"
```

Replace all `*ngIf`

Find unused imports and remove them.

Find unused styles and remove them.


# Concepts

## CLI First

This project uses a CLI first approach. The CLI is the primary interface for the user. After that IDEs etc. are used for
development, but you must be able to run any code generation or manipulation from the CLI.

## Getting Started

This project uses `npm` to manage the Node.js environment and dependencies. To get started, follow these steps:

- See: [INITIAL_CONFIG.md](INITIAL_CONFIG.md)

# Git Commits

## Generating new Versions

### Process

1. **Merge feature branch to main** (if working on a feature branch)
2. **Commit any final changes** to main
3. **Create release commit(s)** on main:
   1. Update the version in the `package.json` file
   2. Run the changelog script
4. **Tag and push the release**

### Example

#### Step 1: Merge Feature Branch (if applicable)

If you're working on a feature branch, first ensure it's ready for release:

```shell
# Ensure feature branch is up to date and ready
git checkout feat/your-feature
git add .
git commit -m "feat: add new feature A"

# Switch to main and merge the feature branch
git checkout main
git pull origin main
git merge --ff-only feat/your-feature
```

**Note**: Use `--ff-only` to ensure a clean history. If fast-forward is not possible, rebase the feature branch first.

#### Step 2: Commit any final changes

If there are any additional changes needed on main:

```shell
git add .
git commit -m "docs: update documentation for feature A"
```

#### Step 3: Create Release Commits

Check the last versions:

```shell
git tag --sort=-creatordate | head -n 3
grep '"version":' ../package.json
```

Update version in package.json:

```shell
sed -i '' 's/"version": ".*"/"version": "0.27.0"/' ../package.json
grep '"version":' ../package.json
```

Make sure the changelog script is up to date:

- Change old version to new version etc.

Update the changelog by running the script in the back-end repository:

```shell
(cd ~/projects/capital-copilot-be && poetry run python -m scripts.update_changelog --repo-dir ~/projects/capital-copilot-fe 'v0.27.0' 'v0.26.0')
```

Review and update the new changelog entry to make sure it is correct.

#### Step 4: Tag and Push Release

Create the release commit:

```shell
git add .. && \
git commit -m "chore: bump version to 0.27.0"
```

Push to main and create the release tag:

```shell
git push origin main && \
git tag -a v0.27.0 -m "This release introduces a comprehensive affiliate program with Stripe Connect integration, migrates authentication to OAuth2 with PKCE flow and GraphQL API, and implements a policy management system including cookie consent and terms acceptance. Additionally, the update adds public podcast pages with SEO optimization, RSS feed health monitoring for news sources, and significantly refactors URL routing to use shorter paths." && \
git push origin v0.27.0
```

#### Step 5: Clean up feature branch (if applicable)

After successful release, clean up the feature branch:

```shell
git branch -d feat/your-feature
git push origin --delete feat/your-feature
```

### CI/CD Considerations

For automated releases, this workflow supports:

1. **Feature branches** can be automatically tested and validated before merging
2. **Version bumping** can be automated based on commit messages (conventional commits)
3. **Changelog generation** can be automated as part of the release pipeline
4. **Tagging and deployment** can be triggered automatically after version commits

The key improvement is ensuring all feature work is merged to main **before** any version changes, allowing CI/CD
systems to:

- Run full test suites on the complete feature set
- Generate accurate changelogs from the merged commits
- Create releases from a stable main branch state

## User Agent

In the future it might be good to start updating the user agent to include the version number. This will allow us to
track the version of the client that is being used.

```shell
USER_AGENT=CapitalCopilot/0.12
```

## Commit Message Format

A tribal rule in this project is to use this rule:

- Use imperative mood or present tense: "add feature" not "added feature" or "adds feature".
- Think to yourself: "This change will..." and complete the sentence.

Follow https://gist.github.com/joshbuchea/6f47e86d26.0bce28f8e7f42ae84c716

If and only if the change touches _production_ code it should be prefixed with one of the following:

- feat: (new feature for the user, not a new feature for build script)
- fix: (bug fix for the user, not a fix to a build script)
- refactor: (refactoring production code, e.g. renaming a variable)

If the change does not touch _production_ code it should be prefixed with one of:

- docs: (changes to the documentation)
- style: (formatting, missing semi colons, etc; no production code change)
- test: (adding missing tests, refactoring tests; no production code change)
- chore: (updating grunt tasks etc; no production code change)

# Code Quality

This project uses `prettier` and `eslint` to format and lint the code. To run these tools, use the following commands:

```shell
npm run lint
npm run format
```

To fix linting issues automatically:

```shell
npm run lint:fix
```

To type check the code (if using TypeScript):

```shell
npm run type-check
```

# Pre-Commit Setup

This project uses pre-commit hooks to run the above tools before each commit. The hooks are configured in the `package.json` file and can be set up using tools like `husky` or `simple-git-hooks`.

To install pre-commit hooks (if using husky):

```shell
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
npx husky add .husky/commit-msg "npx commitlint --edit $1"
```

# Manually Running Pre-Commit

To manually run the pre-commit checks, use the following commands:

```shell
npm run lint
npm run type-check
npm run format
```

**WARNING**: When running these manually sometimes a file will be flagged that `git commit` will not flag. This is
because the `git` invocation only checks the _staged_ files, whereas running these commands will check all files.

# Check Scripts

This project uses check scripts to implement custom code quality checks. To run these tools, use the following
commands:

```shell
node scripts/check-copyright.js
```

# Node.js Environment

## Errors

### Module Not Found

```shell
Error: Cannot find module 'some-module'
```

On macOS/Node.js this is usually fixed by:

```shell
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

If using nvm:

```shell
# Use the correct Node.js version
nvm use
npm install
```

### Build Errors - SCSS Budget Exceeded

To reproduce production build errors (like those that occur during deployment):

```shell
npm run build
```

This runs a production build with budget checks enabled. Common errors include:

**SCSS Component Style Budget Exceeded:**
- Maximum warning: 8kB per component
- Maximum error: 16kB per component

When a component's SCSS file exceeds 16kB, the build will fail. To fix:

1. **Identify the large files** from the build output
2. **Refactor the SCSS** by:
   - Extracting common styles to shared SCSS files
   - Removing unused styles
   - Using more concise selectors
   - Leveraging CSS variables instead of repeated values
3. **Increase budgets** (last resort) in `angular.json` under `configurations.production.budgets`

Example error:
```
✘ [ERROR] src/app/news/news-list.component.scss exceeded maximum budget. 
Budget 16.38 kB was not met by 1.53 kB with a total of 17.91 kB.
```

# GPT

To assist in development of this project:
https://chatgpt.com/g/g-D8TyqKkaO-angular-18-coding-copilot
