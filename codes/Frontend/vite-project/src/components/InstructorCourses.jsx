import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useAI } from "../contexts/AIContext";

const InstructorCourses = () => {
  const { user } = useAuth();
  const { updateContext } = useAI();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fallbackThumbnail =
    "https://placehold.co/600x400?text=Course+Thumbnail";

  // Update AI Context
  useEffect(() => {
    updateContext({
      title: "Instructor Dashboard",
      description: "Managing created courses",
      content: `Instructor: ${user?.name}\nTotal Courses: ${courses.length}`,
    });
  }, [user, courses.length, updateContext]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/courses/me/created");
        setCourses(res.data || []);
      } catch (e) {
        setError(e.response?.data?.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this course? This action cannot be undone.")) return;
    try {
      await axios.delete(`/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c._id !== id));
    } catch (e) {
      alert(e.response?.data?.message || "Failed to delete course");
    }
  };

  if (user?.role !== "instructor" && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="text-xl text-gray-900">You do not have access.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
              My Courses
            </h1>
            <p className="text-gray-600 text-lg">
              Create, manage, and publish your courses
            </p>
          </div>
          <Link
            to="/instructor/courses/new"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg font-semibold transition-all hover:scale-105"
          >
            ➕ Create Course
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-800">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden animate-pulse"
              >
                <div className="w-full h-48 bg-gray-300" />
                <div className="p-6 space-y-3">
                  <div className="h-6 bg-gray-300 rounded w-3/4" />
                  <div className="h-4 bg-gray-300 rounded" />
                  <div className="flex gap-2 pt-4">
                    <div className="h-8 bg-gray-300 rounded flex-1" />
                    <div className="h-8 bg-gray-300 rounded flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white border-2 border-gray-200 rounded-3xl p-16 text-center">
            <div className="text-6xl mb-4">📚</div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              No courses yet
            </div>
            <div className="text-gray-600 mb-6 text-lg">
              Start creating your first course today
            </div>
            <Link
              to="/instructor/courses/new"
              className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg font-semibold"
            >
              Create Your First Course
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c) => (
              <div
                key={c._id}
                className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-blue-400 flex flex-col"
              >
                <div className="relative overflow-hidden h-48 bg-gray-200">
                  <img
                    src={c.thumbnailUrl || fallbackThumbnail}
                    onError={(e) => {
                      e.currentTarget.src = fallbackThumbnail;
                    }}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div
                    className={`absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-bold text-white ${c.isPublished ? "bg-emerald-500" : "bg-gray-500"}`}
                  >
                    {c.isPublished ? "✓ Published" : "📝 Draft"}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3
                    className="font-bold text-xl mb-2 group-hover:text-blue-600 transition-colors line-clamp-2"
                    title={c.title}
                  >
                    {c.title}
                  </h3>
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span>📦</span>
                      <span>{(c.contents || []).length} modules</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.isFree ? (
                        <span className="font-bold text-emerald-600">Free</span>
                      ) : (
                        <>
                          <span>₹</span>
                          <span>{c.priceInINR}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-2 h-10">
                    {c.description}
                  </p>
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <Link
                      to={`/instructor/courses/${c._id}/edit`}
                      className="flex-1 text-center px-3 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all text-sm"
                    >
                      ✏️ Edit
                    </Link>
                    <Link
                      to={`/course/${c._id}`}
                      className="flex-1 text-center px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all text-sm"
                    >
                      👁️ View
                    </Link>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Link
                      to={`/instructor/courses/${c._id}/students`}
                      className="flex-[2] text-center px-3 py-2 border-2 border-emerald-500 text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-all text-sm"
                    >
                      👥 Students
                    </Link>
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="flex-1 flex justify-center items-center px-3 py-2 border-2 border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-all text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorCourses;
