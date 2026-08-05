# Playwright's own image ships Node + Chromium + all the system libs the
# scraper needs already installed, pinned to the exact browser build that
# matches the "playwright" version in package-lock.json (1.62.1) — using
# any other Node base image would mean a separate, error-prone
# `playwright install --with-deps chromium` step and a much bigger image.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

WORKDIR /app

ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install deps first (separate layer) so `docker build` only re-runs npm
# install when package.json/package-lock.json actually change.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Railway (and most PaaS hosts) inject their own PORT at runtime; server.js
# already reads process.env.PORT with a 3000 fallback for local/Docker runs.
EXPOSE 3000

CMD ["node", "server.js"]
