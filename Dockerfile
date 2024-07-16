FROM denoland/deno:latest

WORKDIR /app

COPY . .

RUN deno cache main.ts

CMD ["deno", "run", "--watch", "--allow-net", "--allow-env", "main.ts"]