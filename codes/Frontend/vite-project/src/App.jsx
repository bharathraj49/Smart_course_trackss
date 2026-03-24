import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
import Courses from "./components/Courses";
import CourseDetail from "./components/CourseDetail";
import CourseForm from "./components/CourseForm";
import Layout from "./components/Layout";
import Profile from "./components/Profile";
import Analytics from "./components/Analytics";
import InstructorCourses from "./components/InstructorCourses";
import CourseEdit from "./components/CourseEdit";
import CourseStudents from "./components/CourseStudents";
import CodingPlayground from "./components/CodingPlayground";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" /> : children;
};

import { AIProvider } from "./contexts/AIContext";

function App() {
  return (
    <AuthProvider>
      <AIProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <Signup />
                  </PublicRoute>
                }
              />
              <Route
                path="/"
                element={
                  <Layout>
                    <Navigate to="/dashboard" />
                  </Layout>
                }
              />
              <Route
                path="/courses"
                element={
                  <Layout>
                    <Courses />
                  </Layout>
                }
              />
              <Route
                path="/course/:id"
                element={
                  <Layout>
                    <CourseDetail />
                  </Layout>
                }
              />
              <Route
                path="/instructor/courses/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CourseForm />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/courses"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <InstructorCourses />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/courses/:id/edit"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CourseEdit />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/courses/:id/students"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CourseStudents />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Profile />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Analytics />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/practice"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CodingPlayground />
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </AIProvider>
    </AuthProvider>
  );
}

export default App;
