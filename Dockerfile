# Tempo — production image
# Simple and reliable: full node_modules + `next start`.
# Alpine needs `openssl` for Prisma engines.

FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/app/prisma/tempo.db"
# Provide real values with `docker run -e` or docker-compose
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXTAUTH_SECRET="change-me"

# Persist the SQLite file via a volume mounted at /app/prisma
VOLUME ["/app/prisma"]

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run start"]
