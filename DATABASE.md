# Replit PostgreSQL Setup

This project uses Replit's built-in PostgreSQL database for persistent storage.

## Database Configuration

The application connects to PostgreSQL using the `DATABASE_URL` environment variable, which is automatically set by Replit when you enable PostgreSQL.

### Enabling PostgreSQL on Replit

1. Go to your Replit project
2. Click on "Tools" in the left sidebar
3. Select "Database" or "PostgreSQL"
4. Click "Enable PostgreSQL"
5. Replit will automatically set the `DATABASE_URL` environment variable

### Local Development

For local development, you'll need to set up your own PostgreSQL database and configure the `DATABASE_URL` environment variable:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

## Database Schema

The database schema is managed using Drizzle ORM. To push schema changes:

```bash
npm run db:push
```

## Important Notes

- **Do not use SQLite**: This project requires PostgreSQL for deployment
- **DATABASE_URL must be set**: The application will fail to start without it
- **SSL in production**: The connection uses SSL when `NODE_ENV=production`
