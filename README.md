# DbVessel 🌌

DbVessel is a modern, cross-platform, universal database client designed for both **Desktop** and **Mobile** platforms. Powered by a shared React/TypeScript core and styled with a premium, sleek **Glassmorphism Dark Mode** theme, DbVessel allows developers to manage, query, and visualize multiple database types seamlessly.

---

## 🚀 Key Features

- **Multi-Database Support:** Seamless connections to PostgreSQL, MySQL, SQLite, and MongoDB.
- **Shared Core Logic:** Centralized state management, database query stores, and AI automation engines powered by Zustand in `@db-client/core`.
- **Cross-Platform:**
  - **Desktop App:** Built with React, Vite, and Tailwind CSS v3.
  - **Mobile App:** Built with Expo, Expo Router (file-based navigation), and Nativewind.
- **Sleek Aesthetic:** Fully customized dark space design language featuring glassmorphism elements, custom glows, and Iconsax integration.
- **Monorepo Architecture:** Powered by Turborepo for efficient building, caching, and dependency management.

---

## 📂 Project Structure

```text
dbvessel/
├── apps/
│   ├── desktop/          # React + Vite desktop web client
│   └── mobile/           # Expo + Nativewind mobile client
├── packages/
│   ├── core/             # Zustand stores, query & connection managers
│   └── ui/               # Shared design tokens & UI components
├── docs/                 # Product specifications & architectural designs
├── package.json          # Root workspace configuration
└── turbo.json            # Turborepo task pipeline config
```

---

## 🛠️ Tech Stack

- **Core Frameworks:** React 18, React Native (via Expo SDK 50)
- **Monorepo Tooling:** Turborepo, npm Workspaces
- **Styling & Icons:** Tailwind CSS v3, Nativewind, Iconsax
- **Build Systems:** Vite, Babel, TypeScript
- **State Management:** Zustand
- **Testing:** Vitest

---

## ⚙️ Getting Started

### Prerequisites

Ensure you have **Node.js (v18+)** and **npm** installed on your machine.

### Installation

Install workspace dependencies and link internal packages at the root of the project:

```bash
npm install
```

### Development

To start developing across the workspace, you can run target scripts via Turborepo:

#### Start Desktop App:
```bash
npm run dev --filter=@db-client/desktop
```

#### Start Mobile App:
```bash
npm run start --filter=@db-client/mobile
```

### Building for Production

Compile TypeScript and bundle all packages and apps:

```bash
npm run build
```

### Running Tests

Execute workspace test suites:

```bash
npm run test
```

---

## 📄 License

This project is private and proprietary.
