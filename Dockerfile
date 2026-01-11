FROM node:18-bullseye-slim

# Install system dependencies for Puppeteer (Chromium)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Set Working Directory
WORKDIR /app

# Copy package.json and workspace config first for caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
# We need to copy packages/shared too if it exists
COPY packages ./packages

# Install dependencies
# We use --frozen-lockfile to ensure reproducible builds
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the API (and shared packages)
# "build:api" in root runs "pnpm --filter @attendance/api build"
# which usually depends on shared being built. 
# We'll run "turbo run build --filter=@attendance/api" or just the script
RUN pnpm run build:api

# Set Puppeteer environment variables to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expose the API port
ENV PORT=3001
EXPOSE 3001

# Start the application
CMD ["node", "apps/api/dist/main"]
