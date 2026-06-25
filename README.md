# EDC

20250309:GWF牆域名

| <a href="https://bdfz.net" target="_blank">About Me</a> |

## Direct Pages Deploy

Use these helpers when a Git-connected Pages project is serving traffic but the
normal project-detail / build path is unhealthy.

Requirements:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `npx`, `curl`, `jq`

Generic static deploy:

```bash
./scripts/deploy_pages_static_direct.sh \
  --project-name <pages-project> \
  --directory <build-output-dir> \
  --branch main \
  --commit-hash "$(git rev-parse HEAD)" \
  --commit-message "$(git log -1 --pretty=%s)"
```

`allinone` deploy:

```bash
./scripts/deploy_allinone_direct.sh \
  --account-id "${CLOUDFLARE_ACCOUNT_ID}"
```

The `allinone` helper assembles the Pages output into a temporary directory,
uploads static assets with `wrangler pages project upload`, then creates the
deployment through the Pages API and waits for success.
