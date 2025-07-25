FROM oven/bun:latest

WORKDIR /app

COPY . .

RUN bun install

WORKDIR /app/src

EXPOSE 3144

CMD ["bun", "run", "index.ts"]