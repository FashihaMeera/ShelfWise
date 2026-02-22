# ShelfWise Library Buddy

A modern **Library Management System** built with React, TypeScript, and Supabase.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **State**: TanStack React Query
- **Routing**: React Router v6
- **Charts**: Recharts

## Getting Started

### Prerequisites
- Node.js (v18+) and npm

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project
cd shelfwise-library-buddy

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:8080`.

## Features

- 📚 **Book Management** — Add, edit, delete, search, and filter books with CSV bulk import
- 👥 **Member Management** — View members, manage roles, view profiles
- 🔄 **Borrow / Return** — Issue and return books with due date tracking
- 📅 **Reservations** — Reserve unavailable books with status workflow
- 💰 **Fines** — Automatic overdue fine calculation, pay/waive fines
- ⭐ **Reviews & Ratings** — Members can rate and review books
- 📖 **Reading Lists** — Personal reading list for each member
- 🔔 **Notifications** — In-app notification system
- 📊 **Reports** — Borrowing trends, genre distribution, leaderboard with CSV/JSON export
- 📋 **Activity Log** — Full audit trail of system actions
- 🔐 **Role-Based Access** — Admin, Librarian, and Member roles
- 🌙 **Dark Mode** — Theme toggle support
- 📱 **Responsive** — Mobile-friendly with bottom navigation
- 🔲 **QR Codes** — Generate QR codes for books

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm run lint` | Lint the codebase |
