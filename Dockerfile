# Simple Dockerfile for running a Node.js part of the project.
# Adjust paths and build steps according to the actual project layout.

FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies only when needed
COPY package*.json ./
RUN npm ci --omit=dev || true

# Copy application source
COPY . .

# If there is a build step, uncomment the following lines and adjust as needed
# RUN npm run build

EXPOSE 3000
CMD ["sh", "-c", "[ -f package.json ] && (npm run start || node index.js) || echo 'No Node startup script found.' && sleep infinity"]
