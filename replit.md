# Overview

This is a full-stack authentication application built with React, Express, and TypeScript. The application implements a login system with form validation, user authentication, and login attempt tracking. It features a clean, modern UI using shadcn/ui components and Tailwind CSS, with a PostgreSQL database managed through Drizzle ORM.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **Form Handling**: React Hook Form with Zod for type-safe form validation and schema validation
- **UI Components**: shadcn/ui component library built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS + Telstra official design system (Telstra Able, CNSB Custom) for branded UI

## Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API server
- **Database ORM**: Drizzle ORM for type-safe database operations and schema management
- **Validation**: Zod schemas shared between frontend and backend for consistent validation
- **Storage**: Abstracted storage interface with in-memory implementation (MemStorage) for development, designed to easily swap with database implementation
- **Development**: Vite middleware integration for seamless full-stack development experience

## Database Schema
- **Users Table**: Stores user credentials, preferences (remember username), and timestamps
- **Login Attempts Table**: Tracks all authentication attempts with metadata (IP address, user agent, success status) for security auditing
- **Schema Management**: Drizzle Kit for database migrations and schema evolution

## Authentication Flow
- Multi-step authentication: Username → Password → Loading → SMS Verification → Success
- Date of birth collection with 18+ age validation during SMS verification
- Form validation using shared Zod schemas
- Login attempt logging for security monitoring
- User preference persistence for "remember username" functionality
- Error handling with user-friendly messages via toast notifications
- Real-time admin monitoring via WebSocket for tracking login attempts
- Telstra branding with custom logo and color scheme

## Security Features
- **Confidence-Based Bot Detection**: Blocks high-confidence bots (90%+), logs medium-confidence (70-90%), allows low-confidence traffic
- **Datacenter IP Filtering**: Blocks traffic from known problematic AWS and Azure IP ranges
- **Header Obfuscation**: Removes Express framework indicators, adds security headers (HSTS, CSP, X-Frame-Options)
- **WebSocket Exemptions**: WebSocket upgrade requests bypass security middleware for proper admin monitoring
- **Stealth Mode**: Application appears as standard business application to avoid automated detection

# External Dependencies

## Core Technologies
- **Database**: PostgreSQL with Neon serverless driver for cloud database connectivity
- **Styling**: Tailwind CSS + Telstra Able design system (official Telstra CSS frameworks)
- **Icons**: Lucide React for consistent iconography
- **Fonts**: Telstra Display, Telstra Text Variable, Telstra Akkurat (official Telstra fonts) + Google Fonts

## Development Tools
- **Build Tool**: Vite with React plugin for fast development and optimized production builds
- **TypeScript**: Full-stack type safety with shared type definitions
- **ESBuild**: Fast JavaScript bundling for production server builds
- **PostCSS**: CSS processing with Tailwind and Autoprefixer

## UI and UX Libraries
- **Component System**: Radix UI primitives for accessible component foundations
- **Form Libraries**: React Hook Form for performance and Hookform Resolvers for Zod integration
- **Utility Libraries**: clsx and tailwind-merge for conditional styling, date-fns for date manipulation
- **Animation**: Class Variance Authority for component variant management

## Replit Integration
- **Development**: Replit-specific Vite plugins for runtime error handling and development banner
- **Cartographer**: Replit's code navigation enhancement for improved development experience