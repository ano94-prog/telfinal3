# Replit run guide

## Development

The project is a TypeScript Express server with a Vite React client. The
configured `Start application` workflow runs:

```sh
npm run dev
```

The app listens on port `5000` and is available through the Replit preview.

## Database

The current server uses the checked-in SQLite database at `sqlite.db` through
Drizzle ORM. No external database service or `DATABASE_URL` is required to run
the development app.

## Checks and production build

```sh
npm run check
npm run build
npm start
```

`npm start` serves the files produced by `npm run build`.