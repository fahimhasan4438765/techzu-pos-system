# TechzuPOS - Complete Point of Sale System

A modern, full-stack Point of Sale (POS) system built as a monorepo with React Native mobile app, React.js admin panel, and Node.js/Express API.

## 🏗️ Project Structure

```
TechzuPOS/
├── api/                    # Express.js REST API (Port 3001)
├── web/                    # React.js Admin Panel (Port 3000)  
├── pos/                    # React Native POS App (Expo)
├── documents/              # Project documentation
├── resources/              # Shared resources
├── package.json           # Root workspace configuration
├── pnpm-workspace.yaml    # PNPM workspace definition
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.9.0 (required for Next.js 16)
- **pnpm** >= 8.0.0 (recommended package manager)
- **PostgreSQL** 14+ (for production)
- **Expo CLI** (for React Native development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TechzuPOS
   ```

2. **Install all dependencies**
   ```bash
   pnpm install
   ```

3. **Start all services in development mode**
   ```bash
   pnpm run dev
   ```

This single command will start **Turborepo's TUI (Terminal User Interface)** with separate panes for each service:
- 🔵 **API Server** on http://localhost:3001 (dedicated pane)
- 🟢 **Web Admin Panel** on http://localhost:3000 (dedicated pane)
- 🟣 **POS Mobile App** via Expo (dedicated pane)

**Navigate between services** using arrow keys, view clean separated logs, and manage each service independently!

## 📱 Applications

### 1. API Server (`/api`)
Express.js REST API with PostgreSQL database.

**Features:**
- JWT-based authentication
- Product management CRUD
- Order processing
- Swagger API documentation
- Clean architecture with modular design

**Development:**
```bash
pnpm api dev          # Start API in development mode
pnpm api start        # Start API in production mode
pnpm api test         # Run API tests
```

### 2. Web Admin Panel (`/web`)
React.js application built with Next.js and Tailwind CSS.

**Features:**
- Admin authentication
- Product catalog management
- Order history and analytics
- Responsive design
- Apple-style UI theme

**Development:**
```bash
pnpm web dev          # Start Next.js dev server
pnpm web build        # Build for production
pnpm web start        # Start production server
```

### 3. POS Mobile App (`/pos`)
React Native application built with Expo.

**Features:**
- Product catalog browsing
- Shopping cart management
- Multiple payment methods (Cash, Card, QR)
- Order history
- Offline-first capability (bonus feature)

**Development:**
```bash
pnpm pos start        # Start Expo development server
pnpm pos android      # Run on Android device/emulator
pnpm pos ios          # Run on iOS device/simulator
pnpm pos web          # Run as web application
```

## 🗄️ Database Schema

### Core Models

**users**
- Authentication and role management
- Roles: `admin`, `cashier`

**products**  
- Product catalog with SKU, pricing, categories
- Tax rate configuration per product
- Optional image URLs

**orders**
- Order tracking with payment methods
- Subtotal, tax, and total calculations
- Order status management

**order_items**
- Line items for each order
- Quantity and pricing details
- Individual tax calculations

## 🖥️ Turborepo TUI Management

### Interactive Development Interface
The `pnpm run dev` command launches **Turborepo's TUI** with separate panes for each service:

```
┌─────────────────────┬─────────────────────────────────────┐
│ Tasks (/ - Search)  │ @techzu-pos/web#dev > cache bypass  │
│ » @techzu-pos/web   │                                     │
│ » @techzu-pos/api   │ ✓ Next.js ready on port 3000       │
│ » @techzu-pos/pos   │ GET / 200 in 45ms                   │
│                     │ ...clean web logs only...           │
└─────────────────────┴─────────────────────────────────────┘
↑ ↓ - Select   i - Interact   u/d - Scroll logs
```

**Benefits:**
- ✅ **Visual service selection** - Sidebar shows all running services
- ✅ **Clean log separation** - Right pane shows only selected service logs
- ✅ **Interactive navigation** - Use arrow keys to switch between services
- ✅ **Real-time status** - See which services are running/building
- ✅ **Scroll through history** - Navigate through each service's log history

**Navigation Controls:**
- `↑ ↓` - Select different services
- `i` - Interact with selected service
- `u/d` - Scroll logs up/down
- `m` - Show more key bindings
- `Ctrl+C` - Stop all services

## �🔧 Development Workflow

### Root Commands
```bash
# Start all services with Turborepo TUI (RECOMMENDED)
pnpm run dev

# Start individual services
pnpm run dev:api     # Just the API server
pnpm run dev:web     # Just the web admin
pnpm run dev:pos     # Just the POS app

# Build all projects
pnpm run build

# Run all tests
pnpm run test

# Lint all code
pnpm run lint

# Clean all node_modules
pnpm run clean
```

### Individual Project Commands
```bash
# Work with specific projects
pnpm api <command>     # Run command in API project
pnpm web <command>     # Run command in Web project  
pnpm pos <command>     # Run command in POS project
```

## 🌐 API Endpoints

### Authentication
- `POST /auth/register` - Create new user account
- `POST /auth/login` - User authentication

### Products
- `GET /products` - List all products (public)
- `POST /products` - Create product (admin only)
- `PATCH /products/:id` - Update product (admin only)
- `DELETE /products/:id` - Delete product (admin only)

### Orders
- `GET /orders` - List orders (admin only)
- `GET /orders/:id` - Get order details (admin only)
- `POST /orders` - Create new order
- `POST /sync/orders` - Bulk sync offline orders (bonus)

## 🎨 Design System

### Theme
- **Primary Colors:** Apple-style clean aesthetics
- **Typography:** System fonts with high contrast
- **Components:** Minimalist, functional design
- **Responsive:** Mobile-first approach

### Color Palette
- Clean whites and light grays
- Subtle shadows and borders
- High contrast text
- Consistent spacing and typography

## 🧪 Testing

### API Testing
```bash
pnpm api test          # Jest unit and integration tests
```

### Web Testing  
```bash
pnpm web test          # React Testing Library + Jest
```

### POS Testing
```bash
pnpm pos test          # React Native Testing Library
```

## 📦 Deployment

### Local Development
```bash
pnpm run dev           # Turborepo TUI with all services
```

### Docker Development
```bash
# Start all services in Docker with Turborepo TUI
pnpm run docker:dev

# Or use docker-compose directly
docker-compose up --build

# Run in background (detached mode)
pnpm run docker:dev:detached

# View logs
pnpm run docker:logs

# Stop all services
pnpm run docker:stop

# Clean up containers and images
pnpm run docker:clean
```

### Production Build
```bash
pnpm run build         # Build all projects for production
pnpm run start         # Start API and Web in production mode
```

## � Docker Development

### Quick Start with Docker

#### Prerequisites
1. **Install Docker Desktop**: Download from [docker.com](https://www.docker.com/products/docker-desktop/)
2. **Start Docker Desktop**: Open the app and wait for the whale icon to turn green

#### Setup
```bash
# Clone the repository
git clone <repository-url>
cd TechzuPOS

# Check if Docker is ready
pnpm run docker:check

# Start everything with one command
pnpm run docker:dev
```

### Docker Features
- ✅ **Complete environment** - All services pre-configured
- ✅ **Hot reloading** - Code changes reflect immediately
- ✅ **Port mapping** - Access services from host machine
- ✅ **Volume mounting** - Persistent development files
- ✅ **Turborepo TUI** - Same great development experience

### Service Access
When running with Docker:
- 🔵 **API Server** → http://localhost:3001
- 🟢 **Web Admin** → http://localhost:3000
- 🟣 **POS App** → http://localhost:8081 (Expo DevTools)
- 🗄️ **PostgreSQL** → localhost:5432 (optional, use `--profile database`)

### Docker Commands
```bash
# Check Docker status (run this first!)
pnpm run docker:check

# Development (with logs visible)
pnpm run docker:dev

# Development (background)
pnpm run docker:dev:detached

# View logs
pnpm run docker:logs

# Access container shell
pnpm run docker:shell

# Stop services
pnpm run docker:stop

# Clean up everything
pnpm run docker:clean
```

## �🔄 Offline Capabilities (Bonus Feature)

The POS mobile app includes offline-first functionality:

- **Local Storage:** SQLite/AsyncStorage for product cache
- **Sync Queue:** Pending orders stored locally when offline  
- **Auto-Sync:** Automatic synchronization when connection restored
- **Conflict Resolution:** Server-authoritative conflict handling

## 🛠️ Technology Stack

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Database:** PostgreSQL 14+
- **Authentication:** JWT
- **Documentation:** Swagger/OpenAPI

### Frontend Web
- **Framework:** React 19 + Next.js 16
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript 5
- **State Management:** React Query
- **Forms:** React Hook Form

### Mobile App
- **Framework:** React Native + Expo
- **Navigation:** React Navigation 7
- **Language:** TypeScript 5
- **Offline Storage:** AsyncStorage/SQLite

### DevOps
- **Package Manager:** pnpm workspaces
- **Build System:** Turborepo with TUI
- **Linting:** ESLint + Prettier
- **Testing:** Jest + Testing Library

## 📄 License

MIT License - see LICENSE file for details.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📞 Support

For questions and support, please open an issue in the GitHub repository.

---

**Built with ❤️ by the TechzuPOS Team**