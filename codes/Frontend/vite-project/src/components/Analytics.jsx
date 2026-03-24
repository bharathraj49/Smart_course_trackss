import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Analytics = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [instructorStats, setInstructorStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        setLoading(true);
        if (user?.role === 'instructor' || user?.role === 'admin') {
          const res = await axios.get('/courses/me/analytics');
          if (alive) setInstructorStats(res.data || []);
        } else {
          const res = await axios.get('/courses/me/enrollments');
          if (alive) setEnrollments(res.data || []);
        }
      } catch (e) {
        if (alive) setError(e.response?.data?.message || 'Failed to load analytics');
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [user?.role]);

  const stats = useMemo(() => {
    if (user?.role === 'instructor' || user?.role === 'admin') return null;
    const enrolled = enrollments.length;
    const completed = 0;
    const totalMinutes = enrollments.reduce((sum, enr) => {
      const mins = (enr.course?.contents || []).reduce((s, c) => s + (c.durationMinutes || 0), 0);
      return sum + mins;
    }, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    return { enrolled, completed, totalHours };
  }, [enrollments, user?.role]);

  const instructorTotals = useMemo(() => {
    if (!Array.isArray(instructorStats)) return { totalEnrollments: 0, totalViews: 0, totalWatched: 0, courseCount: 0 };
    return {
      totalEnrollments: instructorStats.reduce((sum, s) => sum + (s.enrollments || 0), 0),
      totalViews: instructorStats.reduce((sum, s) => sum + (s.views || 0), 0),
      totalWatched: instructorStats.reduce((sum, s) => sum + (s.watched || 0), 0),
      courseCount: instructorStats.length
    };
  }, [instructorStats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Analytics Dashboard</h1>
          <p className="text-gray-600">{user?.role === 'instructor' || user?.role === 'admin' ? 'Track your course performance' : 'View your learning progress'}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-800">
            ⚠️ {error}
          </div>
        )}

        {/* Instructor/Admin View */}
        {user?.role === 'instructor' || user?.role === 'admin' ? (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">📚</span>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">Courses</span>
                </div>
                <div className="text-4xl font-bold mb-1">{instructorTotals.courseCount}</div>
                <p className="text-blue-100">Total courses created</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">👥</span>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">Enrollments</span>
                </div>
                <div className="text-4xl font-bold mb-1">{instructorTotals.totalEnrollments}</div>
                <p className="text-green-100">Total student enrollments</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">👁️</span>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">Views</span>
                </div>
                <div className="text-4xl font-bold mb-1">{instructorTotals.totalViews}</div>
                <p className="text-purple-100">Total course views</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">✓</span>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">Completed</span>
                </div>
                <div className="text-4xl font-bold mb-1">{instructorTotals.totalWatched}</div>
                <p className="text-orange-100">Modules completed</p>
              </div>
            </div>

            {/* Course Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span>📈</span>
                Course Performance
              </h2>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                  <p className="text-gray-600 mt-4">Loading your courses...</p>
                </div>
              ) : instructorStats.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <span className="text-4xl block mb-2">📚</span>
                  <p className="text-gray-600">No courses created yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {instructorStats.map(course => (
                    <div key={course.courseId} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200 hover:border-blue-400 transition-all">
                      <h3 className="font-bold text-gray-900 mb-4 text-lg line-clamp-2" title={course.title}>
                        {course.title}
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-white rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">👥</span>
                            <span className="text-sm text-gray-600">Enrollments</span>
                          </div>
                          <span className="font-bold text-gray-900 text-lg">{course.enrollments || 0}</span>
                        </div>

                        <div className="flex items-center justify-between bg-white rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">👁️</span>
                            <span className="text-sm text-gray-600">Views</span>
                          </div>
                          <span className="font-bold text-gray-900 text-lg">{course.views || 0}</span>
                        </div>

                        <div className="flex items-center justify-between bg-white rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">✓</span>
                            <span className="text-sm text-gray-600">Completed</span>
                          </div>
                          <span className="font-bold text-gray-900 text-lg">{course.watched || 0}</span>
                        </div>
                      </div>

                      {course.enrollments > 0 && (
                        <div className="mt-4 pt-4 border-t-2 border-gray-200">
                          <div className="text-xs text-gray-600 mb-2">Completion Rate</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                              style={{ width: `${Math.round(((course.watched || 0) / course.enrollments) * 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-600 mt-1 text-right">{Math.round(((course.watched || 0) / course.enrollments) * 100)}%</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Student View
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">📚</span>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">Enrolled</span>
                </div>
                <div className="text-4xl font-bold mb-1">{loading ? '—' : stats.enrolled}</div>
                <p className="text-blue-100">Courses enrolled in</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">✓</span>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">Completed</span>
                </div>
                <div className="text-4xl font-bold mb-1">{loading ? '—' : stats.completed}</div>
                <p className="text-green-100">Courses completed</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">⏱️</span>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">Learning Time</span>
                </div>
                <div className="text-4xl font-bold mb-1">{loading ? '—' : `${stats.totalHours}h`}</div>
                <p className="text-purple-100">Total learning hours</p>
              </div>
            </div>

            {/* Enrolled Courses */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span>📖</span>
                My Enrolled Courses
              </h2>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                  <p className="text-gray-600 mt-4">Loading your enrollments...</p>
                </div>
              ) : enrollments.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <span className="text-4xl block mb-2">🎓</span>
                  <p className="text-gray-600">You haven't enrolled in any courses yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {enrollments.map(enrollment => (
                    <div key={enrollment._id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200 hover:border-blue-400 transition-all">
                      <h3 className="font-bold text-gray-900 mb-3 text-lg">{enrollment.course?.title}</h3>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Status</span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold text-xs capitalize">{enrollment.status}</span>
                        </div>

                        {enrollment.progress?.preTestScore !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Pre-Test Score</span>
                            <span className="font-bold text-gray-900">{enrollment.progress.preTestScore}%</span>
                          </div>
                        )}
                      </div>

                      <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">
                        Continue Learning →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics; 