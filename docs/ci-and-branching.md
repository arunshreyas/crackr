# CI and branch workflow

`main` is the production branch. Work on short lived `feat/*` branches for features and `fix/*` branches for bug fixes. GitHub Actions checks pushes to every branch except `main`, and pull requests targeting `main`.

## Start work

```sh
git switch main
git pull --ff-only
git switch -c feat/short-description
# or: git switch -c fix/short-description
```

Commit and push the branch, then open a pull request with `main` as the base. Keep the PR focused and address any review or CI failures before merging. Do not push work directly to `main`.

## Local checks

Use Node.js 22 and npm with the committed `package-lock.json`:

```sh
npm ci
npm run lint
npm run typecheck
npm run test:ingest
npm run build
```

The repository currently has one isolated ingestion validation test. Other `scripts/test-*` programs access and modify database records, so they are not part of CI. CI does not run migrations or connect to PostgreSQL. It provides nonproduction placeholder database URLs for the Next.js build only. Never substitute production credentials in CI.

If a required check fails, the workflow reports failure and the PR should not be merged until the cause is fixed and the checks pass. CI runs with read-only repository contents permission and does not print secrets.

## Protect `main`

In GitHub, open **Settings → Rules → Rulesets** (or **Branches → Branch protection rules**) and add a rule targeting `main`:

- Require a pull request before merging.
- Require status checks to pass; select **Lint, typecheck, tests, build** (the CI job check).
- Require branches to be up to date before merging if the repository's merge activity makes that practical.
- Block force pushes and deletion of `main`.
- Do not require multiple approvals for a solo-maintained repository unless you choose to.

GitHub repository settings are not changed by this repository workflow and must be enabled by a repository administrator.

## Vercel

Keep `main` configured as the Vercel **Production Branch**. Vercel continues to create Preview Deployments for feature branches and pull requests, and Production Deployments for changes merged into `main`; this CI workflow does not deploy anything.

Preview builds use the environment variables configured in Vercel for the **Preview** environment. Configure preview-scoped Clerk test credentials and a dedicated nonproduction PostgreSQL database if preview routes/builds need those services. Do not copy production database credentials into Preview. The GitHub Actions build itself uses placeholder database URLs and requires no Clerk or database secrets.
