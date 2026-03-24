import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ChatBot from "./ChatBot";

const Layout = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to={isAuthenticated ? "/dashboard" : "/"}
            className="flex items-center gap-2"
          >
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center font-bold shadow-sm">
              S
            </div>
            <span className="font-semibold tracking-tight">
              Smart Course Track
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <NavLink
              to="/courses"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md transition ${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`
              }
            >
              Courses
            </NavLink>
            {isAuthenticated &&
              (user?.role === "instructor" || user?.role === "admin") && (
                <NavLink
                  to="/instructor/courses"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md transition ${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`
                  }
                >
                  Manage
                </NavLink>
              )}
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md transition ${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`
                  }
                >
                  Dashboard
                </NavLink>
                <button
                  onClick={logout}
                  className="ml-2 px-3 py-2 rounded-md bg-gradient-to-tr from-rose-600 to-orange-500 text-white shadow-sm hover:opacity-90"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md ${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`
                  }
                >
                  Login
                </NavLink>
                <NavLink
                  to="/signup"
                  className="px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-black"
                >
                  Sign up
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between text-sm text-gray-500">
          <span>© {new Date().getFullYear()} Smart Course Track</span>
          <div className="flex items-center gap-4">
            <a className="hover:text-gray-700" href="#">
              Terms
            </a>
            <a className="hover:text-gray-700" href="#">
              Privacy
            </a>
          </div>
        </div>
      </footer>
      <ChatBot />
    </div>
  );
};

export default Layout;
