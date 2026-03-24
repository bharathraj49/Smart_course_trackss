# Smart Course Track LMS

A Learning Management System (LMS) with role-based authentication for Students, Instructors, and Administrators.

## Features

- **Role-based Authentication**: Support for User (Student), Instructor, and Admin roles
- **Secure Login/Signup**: JWT-based authentication with password hashing
- **Modern UI**: Built with React and Tailwind CSS
- **Responsive Design**: Works on desktop and mobile devices
- **Protected Routes**: Automatic redirection based on authentication status

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- CORS for cross-origin requests

### Frontend
- React 19
- React Router for navigation
- Tailwind CSS for styling
- Axios for API calls
- Context API for state management

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)
- Git

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the Backend directory with the following variables:
   ```env
   MONGO_URI=mongodb+srv://bharath:Bharath@cluster0.1gkorum.mongodb.net/finalyearproject
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   PORT=5000
   ```

4. Start the backend server:
   ```bash
   npm start
   ```

   The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd Frontend/vite-project
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:5173`

## Project Structure

```
Smart_course_Track/
├── Backend/
│   ├── models/
│   │   └── User.js              # User model with role-based schema
│   ├── routes/
│   │   └── auth.js              # Authentication routes
│   ├── middleware/
│   │   └── auth.js               # JWT authentication middleware
│   ├── index.js                  # Main server file
│   └── package.json
├── Frontend/
│   └── vite-project/
│       ├── src/
│       │   ├── components/
│       │   │   ├── Login.jsx     # Login page component
│       │   │   ├── Signup.jsx    # Signup page component
│       │   │   └── Dashboard.jsx # Dashboard component
│       │   ├── contexts/
│       │   │   └── AuthContext.jsx # Authentication context
│       │   ├── App.jsx            # Main app component with routing
│       │   └── main.jsx          # Entry point
│       └── package.json
└── README.md
```

## User Roles

### Student (User)
- Can view courses and enroll
- Access to learning materials
- Track progress

### Instructor
- Can create and manage courses
- View student progress
- Upload course materials
- Requires specialization and experience fields

### Administrator (Admin)
- Full system access
- User management
- Course oversight
- System analytics

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /register` - Register a new user
- `POST /login` - Login user
- `GET /me` - Get current user (protected)
- `POST /logout` - Logout user (protected)

### Request/Response Examples

#### Register
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "instructor",
  "specialization": "Web Development",
  "experience": 5
}
```

#### Login
```json
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

## Security Features

- Password hashing with bcryptjs
- JWT tokens with expiration
- Protected routes with authentication middleware
- Input validation and sanitization
- CORS configuration
- Role-based access control

## Development

   ```

### ⚡ Windows Setup (Recommended)

1. **One-Click Start**:
   - Double-click `start_dev.bat` in the project root.
   - It will automatically launch both Backend and Frontend in separate terminal windows.

2. **Manual Method**:
   See "Running Both Servers" below.

### Running Both Servers (Manual)

1. Open two terminal windows
2. In the first terminal, start the backend:
   ```bash
   cd Backend
   npm start
   ```
3. In the second terminal, start the frontend:
   ```bash
   cd Frontend/vite-project
   npm run dev
   ```

### Testing the Application
### Courses & Payments

1. Create a course as an instructor/admin at `/instructor/courses/new`.
2. Publish it and view it on `/courses` and `/course/:id`.
3. As a student, click Enroll to start a Stripe Checkout session.
4. On successful payment, the webhook marks your enrollment as active.

### Stripe Environment Variables

Create `.env` in `Backend/`:
```env
MONGO_URI=...
JWT_SECRET=...
PORT=5000
STRIPE_SECRET_KEY=sk_test_...
CLIENT_URL=http://localhost:5173
```

Create `.env` in `Frontend/vite-project/`:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```


1. Navigate to `http://localhost:5173`
2. Try registering with different roles:
   - Student: Basic registration
   - Instructor: Requires specialization
   - Admin: Full access
3. Test login with created accounts
4. Verify role-based dashboard access

## Environment Variables

### Backend (.env)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 5000)
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret (optional for local)
- `CLIENT_URL`: Frontend URL (e.g. http://localhost:5173)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.
