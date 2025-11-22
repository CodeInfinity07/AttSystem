# Bot Management Dashboard

## Overview

A Telegram bot management dashboard built with React (frontend) and Express (backend). The application provides a unified interface for managing multiple Telegram bots, including membership verification, message sending, voice operations, name changes, and batch bot loading. The dashboard uses a productivity-focused design system inspired by Linear/Vercel, optimized for data-dense workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** (React Query) for server state management with 2-second polling intervals for real-time updates

**UI Component System**
- **Radix UI** primitives for accessible, unstyled components
- **shadcn/ui** component library following the "New York" style variant
- **Tailwind CSS** for utility-first styling with custom design tokens
- **class-variance-authority** (CVA) for component variant management

**Design System**
- Dark-mode-first productivity aesthetic (Linear/Vercel inspired)
- Custom color palette with semantic status colors (success, warning, error, info, accent)
- Inter font family for text, Fira Code for monospace/code elements
- Spacing system using Tailwind's 8-point grid (1, 2, 3, 4, 6, 8, 12, 16)
- Elevation system with hover/active states using opacity overlays

**State Management Pattern**
- Server state via TanStack Query with aggressive polling for task status updates
- Local UI state with React hooks (useState)
- No global state management library - keeps state close to components

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript running on Node.js
- RESTful API endpoints organized by feature (messages, mic, name-change, loader, membership)
- In-memory storage implementation via `MemStorage` class (implements `IStorage` interface)
- Custom request logging middleware that captures JSON responses and logs API calls

**API Design Pattern**
- Task-based endpoints with start/stop/status operations
- Status polling endpoints return full task state including bot lists and progress
- Mutations return success/error responses with descriptive messages
- Consistent response format: `{ success: boolean }` or `{ error: string }`

**Storage Layer**
- Interface-based storage abstraction (`IStorage`) for future database implementations
- In-memory Map-based storage for bots, task states, and membership results
- Task state includes: status (idle/running/stopped), progress metrics, and bot arrays
- Bot entities tracked with status, permissions (msgPerm, micPerm), and metadata

### Data Storage Solutions

**Current Implementation**
- In-memory storage using JavaScript `Map` objects for rapid prototyping
- No persistent database configured yet

**Database Configuration (Prepared but Unused)**
- **Drizzle ORM** configured with PostgreSQL dialect
- **Neon Database** serverless driver (@neondatabase/serverless)
- Schema defined with user authentication table (users with username/password)
- Migration system configured via drizzle-kit

**Session Management**
- `connect-pg-simple` included for PostgreSQL-backed sessions (not yet implemented)

### Authentication and Authorization

**Not Currently Implemented**
- User schema defined in `shared/schema.ts` but no auth routes
- No login/logout flows in frontend
- No authentication middleware on backend routes
- Application currently operates without user sessions

### External Dependencies

**Third-Party UI Libraries**
- Radix UI component primitives (20+ component packages)
- Lucide React icons for consistent iconography
- date-fns for date formatting utilities
- embla-carousel-react for carousel components (if needed)
- cmdk for command palette functionality
- react-day-picker for calendar components
- vaul for drawer components
- recharts for data visualization

**Build & Development Tools**
- esbuild for production server bundling
- tsx for TypeScript execution in development
- Replit-specific plugins: runtime error overlay, cartographer, dev banner

**Validation & Forms**
- Zod for schema validation
- drizzle-zod for ORM schema validation
- @hookform/resolvers for form validation integration
- react-hook-form (inferred from resolvers dependency)

**Deployment Environment**
- Configured for Replit deployment with environment-specific builds
- Separate client/server build outputs
- Static file serving in production mode
- Vite middleware for HMR in development