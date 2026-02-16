# TestTrack Pro - Web Frontend

The React-based frontend application for TestTrack Pro test management platform.

## Overview

A modern, responsive web application built with React, Vite, and Tailwind CSS that provides:
- **Intuitive UI**: Clean, modern interface for test management
- **Real-time Updates**: Live test execution tracking with Socket.IO
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Rich Analytics**: Interactive charts and dashboards
- **Role-Based UI**: Dynamic interface based on user permissions

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: React Context API + Hooks
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library
- **Date Handling**: date-fns

## Project Structure

```
apps/web/
├── public/                    # Static assets
│   ├── favicon.ico
│   └── images/
├── src/
│   ├── main.jsx              # Application entry point
│   ├── App.jsx               # Root component with routing
│   ├── pages/                # Page components
│   │   ├── Dashboard.jsx
│   │   ├── TestCases.jsx
│   │   ├── TestExecutions.jsx
│   │   ├── BugTracker.jsx
│   │   ├── Analytics.jsx
│   │   └── ...
│   ├── components/           # Reusable components
│   │   ├── Layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Footer.jsx
│   │   ├── TestCase/
│   │   │   ├── TestCaseCard.jsx
│   │   │   ├── TestCaseForm.jsx
│   │   │   └── TestStepEditor.jsx
│   │   ├── Bug/
│   │   │   ├── BugCard.jsx
│   │   │   ├── BugForm.jsx
│   │   │   └── BugStatusBadge.jsx
│   │   ├── Charts/
│   │   │   ├── ExecutionTrendChart.jsx
│   │   │   └── BugSeverityChart.jsx
│   │   └── Common/
│   │       ├── Button.jsx
│   │       ├── Modal.jsx
│   │       ├── Table.jsx
│   │       └── ...
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.js        # Authentication hook
│   │   ├── useSocket.js      # Socket.IO hook
│   │   ├── useTestCases.js   # Test case data hook
│   │   ├── useBugs.js        # Bug data hook
│   │   └── ...
│   ├── context/              # React Context providers
│   │   ├── AuthContext.jsx   # Auth state management
│   │   ├── SocketContext.jsx # Socket connections
│   │   └── NotificationContext.jsx
│   ├── lib/                  # Utilities & helpers
│   │   ├── api.js            # Axios instance & API calls
│   │   ├── auth.js           # Auth utilities
│   │   ├── permissions.js    # Permission checks
│   │   └── utils.js          # Helper functions
│   ├── styles/               # Global styles
│   │   ├── index.css         # Tailwind imports
│   │   └── custom.css        # Custom CSS
│   └── test-utils/           # Testing utilities
│       └── test-helpers.jsx
├── index.html                # HTML template
├── vite.config.ts            # Vite configuration
├── vitest.config.ts          # Vitest test config
├── tailwind.config.js        # Tailwind CSS config
├── postcss.config.js         # PostCSS config
├── eslint.config.js          # ESLint config
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Backend API server running (see [apps/api/README.md](../api/README.md))

### Installation

```bash
# From project root
pnpm install

# Or from this directory
cd apps/web
pnpm install
```

### Environment Setup

Create `.env` file (optional - defaults work for local dev):

```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001

# Feature Flags (optional)
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_GITHUB_INTEGRATION=true
```

### Running the App

```bash
# Development mode with hot reload
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run tests
pnpm test

# Run linter
pnpm lint
```

The app will be available at: http://localhost:5173

## Features

### 🔐 Authentication & Authorization

- User registration with email verification
- JWT-based authentication
- Role-based access control (RBAC)
- Session management

### 📋 Test Case Management

- Create, edit, delete test cases
- Organize with tags and modules
- Test case versioning
- Clone and template support
- Import/export test cases

### 🚀 Test Execution

- Execute test runs
- Real-time status updates
- Track execution progress
- Add evidence (screenshots, logs)
- Execution history

### 🐛 Bug Tracking

- Report bugs from failed tests
- Bug lifecycle management
- Assign to developers
- Link to test cases
- Attachment support

### 📊 Analytics & Reporting

- Dashboard with key metrics
- Test execution trends
- Bug severity analysis
- Team productivity charts
- Export reports

### 💬 Real-time Features

- Live test execution updates
- Instant notifications
- Team chat/comments
- Activity feed

### 🎨 UI Components

All components follow consistent design patterns:

```jsx
// Example component usage
import { Button, Modal, Table } from '@/components/Common';

function MyComponent() {
  return (
    <div>
      <Button variant="primary" onClick={handleClick}>
        Create Test Case
      </Button>
      
      <Table 
        data={testCases}
        columns={columns}
        onRowClick={handleRowClick}
      />
      
      <Modal isOpen={isOpen} onClose={handleClose}>
        {/* Modal content */}
      </Modal>
    </div>
  );
}
```

## Custom Hooks Usage

### useAuth Hook

```jsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, login, logout, hasPermission } = useAuth();
  
  if (!hasPermission('test:create')) {
    return <div>Access Denied</div>;
  }
  
  return <div>Welcome, {user.name}!</div>;
}
```

### useSocket Hook

```jsx
import { useSocket } from '@/hooks/useSocket';

function LiveTestExecution() {
  const socket = useSocket();
  
  useEffect(() => {
    socket.on('execution:updated', (data) => {
      console.log('Execution updated:', data);
    });
    
    return () => socket.off('execution:updated');
  }, [socket]);
}
```

### useTestCases Hook

```jsx
import { useTestCases } from '@/hooks/useTestCases';

function TestCaseList() {
  const { testCases, loading, error, createTestCase, updateTestCase } = useTestCases();
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  
  return (
    <div>
      {testCases.map(tc => <TestCaseCard key={tc.id} testCase={tc} />)}
    </div>
  );
}
```

## API Integration

### Making API Calls

```javascript
// src/lib/api.js provides configured axios instance
import api from '@/lib/api';

// GET request
const testCases = await api.get('/api/tests');

// POST request
const newTestCase = await api.post('/api/tests', {
  name: 'Test Login',
  description: 'Verify login functionality'
});

// PUT request
await api.put(`/api/tests/${id}`, updatedData);

// DELETE request
await api.delete(`/api/tests/${id}`);
```

API calls automatically include:
- JWT authentication headers
- Error handling
- Request/response interceptors
- Base URL configuration

## Routing Structure

```jsx
// App.jsx
<Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<Dashboard />} />
    <Route path="test-cases" element={<TestCases />} />
    <Route path="test-cases/:id" element={<TestCaseDetails />} />
    <Route path="executions" element={<TestExecutions />} />
    <Route path="bugs" element={<BugTracker />} />
    <Route path="analytics" element={<Analytics />} />
    <Route path="settings" element={<Settings />} />
  </Route>
  
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
  <Route path="/verify-email" element={<VerifyEmail />} />
</Routes>
```

## Styling

### Tailwind CSS

The app uses Tailwind CSS utility classes:

```jsx
<div className="container mx-auto px-4 py-8">
  <h1 className="text-3xl font-bold text-gray-900 mb-6">
    Test Cases
  </h1>
  
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* Content */}
  </div>
</div>
```

### Custom Theme

Tailwind is extended with custom colors in `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      }
    }
  }
}
```

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Generate coverage
pnpm test:coverage
```

### Writing Tests

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

## Build & Deployment

### Production Build

```bash
# Build optimized production bundle
pnpm build

# Output: dist/ directory
```

### Build Optimization

- Code splitting
- Tree shaking
- Minification
- Asset optimization
- Lazy loading

### Environment Variables

Reference environment variables in code:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

## Performance

- **Initial Load**: < 2s (on 3G)
- **Code Splitting**: Routes lazy loaded
- **Bundle Size**: < 500KB (gzipped)
- **Caching**: Service worker for offline support (optional)

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- ARIA labels and roles
- Screen reader friendly
- Focus management

## Contributing

See [docs/CONTRIBUTING.md](../../docs/CONTRIBUTING.md) for development guidelines.

## License

MIT License - See [LICENSE](../../LICENSE) file for details.
