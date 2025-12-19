# Industry Lens 🎬

A professional review platform for the entertainment industry. Share and discover genuine experiences working with directors, producers, actors, and crew members.

## Features

### For Users
- **Search Professionals**: Find anyone in the entertainment industry by name or IMDB link
- **Write Reviews**: Share your genuine, first-hand experiences
- **Star Rating System**: Rate professionals on a 5-star scale
- **Anonymous Reviews**: Protect your identity while sharing honest feedback
- **User Dashboard**: Manage all your reviews in one place

### For Administrators
- **Review Moderation**: Approve, reject, or flag reviews before publishing
- **User Management**: Create, block, or delete user accounts
- **IMDB Link Management**: Add verified IMDB links to professional profiles
- **Flag Resolution**: Handle reported reviews appropriately

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Backend**: Node.js with Express
- **Styling**: Custom CSS with CSS variables
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Authentication**: JWT tokens

## Getting Started

### Prerequisites
- Node.js 16+ installed
- npm or yarn

### Installation

1. Clone or navigate to the project directory:
```bash
cd /Users/mickey.farmer/Documents/industry-lens
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

### Running the Application

1. Start the backend server (Terminal 1):
```bash
cd server
npm start
```
The API will run on http://localhost:5000

2. Start the frontend (Terminal 2):
```bash
cd client
npm start
```
The app will open at http://localhost:3000

### Test Accounts

For testing purposes, you can quickly log in without creating an account:

- **Quick Test Login**: Click "Quick Test Login" on the login page to access as a regular user
- **Admin Test Login**: Click "Admin Test Login" to access the admin panel

Or use these credentials:
- **Test User**: test@industrylens.com (any password)
- **Admin**: admin@industrylens.com (any password)

## Project Structure

```
industry-lens/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context (Auth)
│   │   ├── pages/          # Page components
│   │   ├── api.ts          # API client
│   │   ├── types.ts        # TypeScript types
│   │   └── App.tsx         # Main app with routing
│   └── package.json
├── server/                 # Express backend
│   ├── index.js           # API server with all endpoints
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/test-login` - Quick test login
- `POST /api/auth/admin-test-login` - Admin test login
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with credentials
- `GET /api/auth/me` - Get current user

### Professionals
- `GET /api/professionals/search` - Search professionals
- `GET /api/professionals/:id` - Get professional profile with reviews
- `POST /api/professionals` - Create new professional

### Reviews
- `GET /api/reviews/my-reviews` - Get current user's reviews
- `POST /api/reviews` - Create new review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review
- `POST /api/reviews/:id/helpful` - Mark as helpful
- `POST /api/reviews/:id/flag` - Flag review

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id/block` - Block/unblock user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/reviews` - List reviews for moderation
- `PUT /api/admin/reviews/:id/status` - Update review status
- `PUT /api/admin/professionals/:id/imdb` - Add IMDB link
- `GET /api/admin/flags` - List flagged reviews
- `PUT /api/admin/flags/:id` - Resolve flag

## Legal Disclaimer

This platform is designed for entertainment professionals to share genuine experiences. Users are solely responsible for the truthfulness of their reviews. False or defamatory statements may result in legal liability.

Key points:
- We do NOT write, edit, or modify user reviews
- We do NOT profit from specific reviews or ratings
- We WILL remove content that violates our terms
- Users may be held liable for defamatory content

See the full [Terms and Conditions](/terms) in the app.

## License

This project is for demonstration purposes.

---

Built with ❤️ for the entertainment industry

