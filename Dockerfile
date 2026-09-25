# Local production-like environment for the portfolio.
#   docker compose up --build        → site on http://localhost:8080 + full test run
#   docker compose run --rm tests    → tests only (exit code = pass/fail)
#
# Targets:
#   build  – regenerates every page from content/ (dependency-free Node script)
#   site   – hardened, non-root nginx serving only the public files
#   test   – Playwright image running the same checks as CI

ARG NODE_VERSION=20
ARG PLAYWRIGHT_VERSION=1.63.0

# ---------------------------------------------------------------- build
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /site
COPY package.json package-lock.json ./
COPY scripts ./scripts
COPY content ./content
COPY assets ./assets
COPY index.html 404.html privacy.html og-image.png robots.txt sitemap.xml feed.xml ./
COPY case-studies ./case-studies
COPY learning-paths ./learning-paths
# The generator has no npm dependencies, so no install step is needed.
RUN node scripts/build.mjs

# Only what a visitor can request ends up in the served image.
RUN mkdir /public \
 && cp -r index.html 404.html privacy.html og-image.png robots.txt sitemap.xml feed.xml \
          assets case-studies learning-paths /public/ \
 && rm -f /public/assets/og-template.html /public/assets/og-page.html

# ----------------------------------------------------------------- site
FROM nginxinc/nginx-unprivileged:1.27-alpine AS site
COPY --chown=root:root docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=root:root /public /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

# ----------------------------------------------------------------- test
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble AS test
WORKDIR /site
ENV CI=true
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Guard against CRLF line endings from a Windows checkout.
RUN sed -i 's/\r$//' scripts/docker-test.sh
CMD ["sh", "scripts/docker-test.sh"]
