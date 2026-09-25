#!/bin/sh
# Full test run inside the "tests" container (see Dockerfile / docker-compose.yml).
# Same checks as .github/workflows/build-check.yml, plus a check of the running
# nginx container when SITE_URL is set.
set -eu

step() { printf '\n==> %s\n' "$1"; }

step "Generated output matches source (npm run check)"
npm run check --silent

step "Content authoring and generation (npm run test:build)"
npm run test:build --silent

step "Local preview server (npm run test:preview)"
npm run test:preview --silent

step "Rendered site: accessibility, 5 viewports, links, interactions (npm run test:browser)"
npm run test:browser --silent

if [ -n "${SITE_URL:-}" ]; then
  step "Served container at ${SITE_URL}: headers, 404, routing, compression"
  node scripts/verify-docker.mjs
fi

printf '\nAll checks passed.\n'
