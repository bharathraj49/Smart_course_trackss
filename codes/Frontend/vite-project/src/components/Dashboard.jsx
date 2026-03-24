import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { useAI } from "../contexts/AIContext";

const Dashboard = () => {
  const { user } = useAuth();
  const { updateContext } = useAI();

  const location = useLocation();
  const [enrollments, setEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const fallbackThumbnail =
    "https://placehold.co/600x400?text=Course+Thumbnail";

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "user":
        return "Student";
      case "instructor":
        return "Instructor";
      case "admin":
        return "Administrator";
      default:
        return role;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "success" || params.get("enrolled") === "1") {
      setShowSuccess(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [location.search]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingEnrollments(true);
        const res = await axios.get("/courses/me/enrollments");
        setEnrollments(res.data || []);
      } finally {
        setLoadingEnrollments(false);
      }
    };
    load();
  }, []);

  // Update AI Context when entering Dashboard
  useEffect(() => {
    updateContext({
      title: "Dashboard",
      description: "Main user dashboard",
      content: `User: ${user?.name} (${user?.role})\nEnrolled Courses: ${enrollments.map((e) => e.course?.title).join(", ")}`,
    });
  }, [user, enrollments, updateContext]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <main className="max-w-7xl mx-auto py-8 px-4 md:px-8">
        {showSuccess && (
          <div className="mb-8 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <div className="font-bold">Payment successful!</div>
              <div className="text-sm opacity-90">
                Your new course has been added to My Courses below.
              </div>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl p-8 md:p-12 mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-2">
                Welcome, {user?.name}! 👋
              </h2>
              <p className="text-blue-100 text-lg mb-4">
                You are logged in as a{" "}
                <span className="font-semibold capitalize">
                  {getRoleDisplayName(user?.role).toLowerCase()}
                </span>
              </p>

              {user?.role === "instructor" && (
                <div className="bg-white/20 backdrop-blur border border-white/30 rounded-2xl p-4 max-w-md">
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    🎓 Instructor Profile
                  </h3>
                  <div className="text-sm space-y-1">
                    <div>
                      <strong>Specialization:</strong>{" "}
                      {user?.specialization || "Not specified"}
                    </div>
                    <div>
                      <strong>Experience:</strong> {user?.experience || 0} years
                      of expertise
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="hidden md:block text-6xl opacity-30">
              {user?.role === "user"
                ? "📚"
                : user?.role === "instructor"
                  ? "👨‍🏫"
                  : "⚙️"}
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 hover:shadow-xl hover:border-blue-400 transition-all">
            <div className="text-4xl mb-3">👤</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Profile</h3>
            <p className="text-gray-600 text-sm mb-4">
              Manage your account settings and profile information.
            </p>
            <Link
              to="/profile"
              className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Open Profile
            </Link>
          </div>

          {/* Courses Card */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 hover:shadow-xl hover:border-blue-400 transition-all">
            <div className="text-4xl mb-3">📖</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Courses</h3>
            <p className="text-gray-600 text-sm mb-4">
              {user?.role === "user"
                ? "Browse and enroll in amazing courses."
                : "Manage your courses and create new content."}
            </p>
            <div className="flex gap-2">
              {user?.role === "user" && (
                <Link
                  to="/courses"
                  className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Browse
                </Link>
              )}
              {(user?.role === "instructor" || user?.role === "admin") && (
                <>
                  <Link
                    to="/instructor/courses/new"
                    className="inline-block px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    ➕ New
                  </Link>
                  <Link
                    to="/instructor/courses"
                    className="inline-block px-4 py-2 border-2 border-gray-300 text-gray-900 rounded-lg font-semibold hover:border-blue-400 transition-all"
                  >
                    Manage
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Analytics Card */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 hover:shadow-xl hover:border-blue-400 transition-all">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600 text-sm mb-4">
              {user?.role === "user"
                ? "Track your learning progress and achievements."
                : "View course metrics and student insights."}
            </p>
            <Link
              to="/analytics"
              className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              View Analytics
            </Link>
          </div>
        </div>

        {/* My Courses Section */}
        {user?.role === "user" && (
          <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                  📚 My Courses
                </h3>
                <p className="text-gray-600 mt-1">
                  Continue your learning journey
                </p>
              </div>
              <Link
                to="/courses"
                className="text-sm font-semibold text-blue-600 hover:text-indigo-600 flex items-center gap-1"
              >
                Find more <span>→</span>
              </Link>
            </div>

            {loadingEnrollments ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500 text-lg">
                  ⏳ Loading your courses...
                </div>
              </div>
            ) : enrollments.length === 0 ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-12 text-center border-2 border-dashed border-blue-200">
                <div className="text-5xl mb-3">🎓</div>
                <div className="text-xl font-semibold text-gray-900 mb-2">
                  No courses yet
                </div>
                <div className="text-gray-600 mb-6">
                  Start your learning journey by enrolling in courses!
                </div>
                <Link
                  to="/courses"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  Browse Courses Now
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map((enr) => (
                  <Link
                    key={enr._id}
                    to={`/course/${enr.course?._id}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl border border-gray-200 hover:border-blue-400 transition-all duration-300"
                  >
                    <div className="relative overflow-hidden h-40">
                      <img
                        src={enr.course?.thumbnailUrl || fallbackThumbnail}
                        onError={(e) => {
                          e.currentTarget.src = fallbackThumbnail;
                        }}
                        alt={enr.course?.title || "Course"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-5">
                      <div className="font-bold text-lg mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {enr.course?.title}
                      </div>
                      <div className="text-xs text-gray-600 mb-3">
                        by{" "}
                        <span className="font-semibold">
                          {enr.course?.createdBy?.name || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <span className="text-xs font-semibold text-blue-600">
                          Continue Learning
                        </span>
                        <span className="group-hover:translate-x-1 transition">
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
