# InnerBrain landing: Bun server serving public/ and the leads API.
FROM oven/bun:1-alpine
WORKDIR /app
COPY server.ts lead.ts ./
COPY public ./public
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "server.ts"]
