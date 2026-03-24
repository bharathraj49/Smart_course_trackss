import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

// Helper: convert total seconds to a human-readable string like "7m 30s"
const fmtTime = (secs) => {
  if (!secs || secs <= 0) return '0s';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
};

const Analytics = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [instructorStats, setInstructorStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Module analytics state
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [moduleAnalytics, setModuleAnalytics] = useState([]);
  const [moduleLoading, setModuleLoading] = useState(false);

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

  // Load module analytics when a course is selected
  useEffect(() => {
    if (!selectedCourseId) { setModuleAnalytics([]); return; }
    let alive = true;
    const load = async () => {
      try {
        setModuleLoading(true);
        const res = await axios.get(`/courses/${selectedCourseId}/module-analytics`);
        if (alive) setModuleAnalytics(res.data || []);
      } catch {
        if (alive) setModuleAnalytics([]);
      } finally {
        if (alive) setModuleLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [selectedCourseId]);

  const stats = useMemo(() => {
    if (user?.role === 'instructor' || user?.role === 'admin') return null;

    // Enrollments count
    const enrolled = enrollments.length;

    // Courses completed (has main certificate)
    const completed = enrollments.filter(e => e.certificate?.issued).length;

    // Total certificates (course certs + module certs)
    let totalCerts = completed;
    enrollments.forEach(e => {
      const modCerts = e.progress?.moduleCertificates || {};
      const modCertsArr = Object.values(modCerts);
      totalCerts += modCertsArr.filter(c => c && c.issued).length;
    });

    // Estimate total learning hours based on watched segments (or just total course sum for now)
    const totalMinutes = enrollments.reduce((sum, enr) => {
      const completedIndices = enr.progress?.completedIndices || [];
      const mins = (enr.course?.contents || []).reduce((s, c, idx) => {
        // Add duration only if module is completed, or half if active? 
        // Defaulting to simple sum of all course content for "Total Course Load" or just completed:
        if (completedIndices.includes(idx)) {
          return s + (c.durationMinutes || 0);
        }
        return s;
      }, 0);
      return sum + mins;
    }, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    return { enrolled, completed, totalCerts, totalHours };
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

  // Max avgSeconds across modules for bar scaling
  const maxModuleSeconds = useMemo(() =>
    Math.max(1, ...moduleAnalytics.map(m => m.avgSeconds || 0)),
    [moduleAnalytics]
  );

  const handleToggleCourse = (courseId) => {
    setSelectedCourseId(prev => prev === courseId ? null : courseId);
  };

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
                <div className="space-y-4">
                  {instructorStats.map(course => (
                    <div key={course.courseId} className="rounded-2xl border-2 border-gray-200 overflow-hidden">
                      {/* Course row */}
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-lg truncate" title={course.title}>
                            {course.title}
                          </h3>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                            <span className="text-base">👥</span>
                            <span className="text-sm text-gray-600">Enrollments</span>
                            <span className="font-bold text-gray-900">{course.enrollments || 0}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                            <span className="text-base">👁️</span>
                            <span className="text-sm text-gray-600">Views</span>
                            <span className="font-bold text-gray-900">{course.views || 0}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                            <span className="text-base">✓</span>
                            <span className="text-sm text-gray-600">Completed</span>
                            <span className="font-bold text-gray-900">{course.watched || 0}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          {/* Student Details Link */}
                          <a
                            href={`/instructor/courses/${course.courseId}/students`}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border-2 shrink-0 bg-white border-blue-200 text-blue-700 hover:border-blue-500 hover:bg-blue-50"
                          >
                            <span>👥</span>
                            Student Details
                          </a>

                          {/* Module time toggle button */}
                          <button
                            onClick={() => handleToggleCourse(course.courseId)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border-2 shrink-0 ${selectedCourseId === course.courseId
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                              : 'bg-white border-indigo-200 text-indigo-700 hover:border-indigo-500 hover:bg-indigo-50'
                              }`}
                          >
                            <span>⏱️</span>
                            {selectedCourseId === course.courseId ? 'Hide Module Times' : 'Module Times'}
                          </button>
                        </div>
                      </div>

                      {/* Completion bar */}
                      {course.enrollments > 0 && (
                        <div className="px-6 py-3 bg-white border-t border-gray-100 flex items-center gap-3">
                          <span className="text-xs text-gray-500 font-semibold shrink-0">Completion Rate</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.round(((course.watched || 0) / course.enrollments) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 font-semibold shrink-0">
                            {Math.round(((course.watched || 0) / course.enrollments) * 100)}%
                          </span>
                        </div>
                      )}

                      {/* Module time breakdown panel */}
                      {selectedCourseId === course.courseId && (
                        <div className="border-t-2 border-indigo-100 bg-indigo-50 p-6">
                          <h4 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <span>⏱️</span> Average Time Spent per Module
                          </h4>

                          {moduleLoading ? (
                            <div className="flex items-center gap-3 py-4">
                              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-600"></div>
                              <span className="text-indigo-700 text-sm">Loading module data…</span>
                            </div>
                          ) : moduleAnalytics.length === 0 ? (
                            <div className="text-center py-6 bg-white rounded-xl border-2 border-dashed border-indigo-200">
                              <span className="text-3xl block mb-2">📭</span>
                              <p className="text-gray-500 text-sm">No time data yet — students haven't visited any modules.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {moduleAnalytics.map((mod) => {
                                const barPct = Math.round((mod.avgSeconds / maxModuleSeconds) * 100);
                                return (
                                  <div key={mod.moduleIndex} className="bg-white rounded-xl p-4 border border-indigo-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                                          {mod.moduleIndex + 1}
                                        </span>
                                        <span className="font-medium text-gray-800 text-sm truncate" title={mod.moduleTitle}>
                                          {mod.moduleTitle}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 shrink-0 ml-3">
                                        <span className="text-indigo-700 font-bold text-sm">
                                          {fmtTime(mod.avgSeconds)}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                          {mod.studentCount} {mod.studentCount === 1 ? 'student' : 'students'}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Bar */}
                                    <div className="w-full bg-indigo-50 rounded-full h-2">
                                      <div
                                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${barPct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Legend */}
                              <p className="text-xs text-gray-400 text-right mt-2">
                                Bar length is relative to the longest module. Avg time is across all students who visited that module.
                              </p>
                            </div>
                          )}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-lg p-6 text-white border border-blue-400 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 text-7xl opacity-10 group-hover:scale-110 transition-transform">📚</div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-3xl">📚</span>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">Enrolled</span>
                </div>
                <div className="text-4xl font-black mb-1 relative z-10">{loading ? '—' : stats.enrolled}</div>
                <p className="text-blue-100 font-medium relative z-10">Courses enrolled in</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl shadow-lg p-6 text-white border border-emerald-400 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 text-7xl opacity-10 group-hover:scale-110 transition-transform">✓</div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-3xl">✓</span>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">Completed</span>
                </div>
                <div className="text-4xl font-black mb-1 relative z-10">{loading ? '—' : stats.completed}</div>
                <p className="text-emerald-100 font-medium relative z-10">Courses completed</p>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl shadow-lg p-6 text-white border border-amber-400 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 text-7xl opacity-10 group-hover:scale-110 transition-transform">🏆</div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-3xl">🏆</span>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">Awards</span>
                </div>
                <div className="text-4xl font-black mb-1 relative z-10">{loading ? '—' : stats.totalCerts}</div>
                <p className="text-amber-100 font-medium relative z-10">Certificates earned</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl shadow-lg p-6 text-white border border-purple-400 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 text-7xl opacity-10 group-hover:scale-110 transition-transform">⏱️</div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-3xl">⏱️</span>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">Learning Time</span>
                </div>
                <div className="text-4xl font-black mb-1 relative z-10">{loading ? '—' : `${stats.totalHours}h`}</div>
                <p className="text-purple-100 font-medium relative z-10">Total learning hours</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {enrollments.map(enrollment => {
                    // Pre-calculations for card
                    const totalModules = enrollment.course?.contents?.length || 1;
                    const completedModules = enrollment.progress?.completedIndices?.length || 0;
                    const progressPct = Math.min(100, Math.round((completedModules / totalModules) * 100));

                    // Quiz averages
                    const quizzes = Object.values(enrollment.progress?.quizResults || {});
                    const avgQuiz = quizzes.length > 0
                      ? Math.round(quizzes.reduce((sum, q) => sum + (q.scorePercent || 0), 0) / quizzes.length)
                      : null;

                    // Module Certificates
                    const modCerts = Object.values(enrollment.progress?.moduleCertificates || {}).filter(c => c && c.issued).length;

                    return (
                      <div key={enrollment._id} className="relative bg-white rounded-3xl p-6 shadow-md border-2 border-gray-100 hover:shadow-2xl hover:border-blue-300 transition-all duration-300 group overflow-hidden">

                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-2 z-10">
                          {enrollment.certificate?.issued ? (
                            <><span className="text-emerald-500">●</span> <span className="text-emerald-700">Completed</span></>
                          ) : progressPct > 0 ? (
                            <><span className="text-blue-500">●</span> <span className="text-blue-700">In Progress</span></>
                          ) : (
                            <><span className="text-gray-400">●</span> <span className="text-gray-600">Not Started</span></>
                          )}
                        </div>

                        {/* Content */}
                        <div className="pr-24">
                          <h3 className="font-black text-gray-900 mb-1 text-xl group-hover:text-blue-600 transition-colors line-clamp-1" title={enrollment.course?.title}>
                            {enrollment.course?.title}
                          </h3>
                          <p className="text-sm text-gray-500 font-medium mb-5">{totalModules} Modules in this course</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-6 space-y-2 relative z-10">
                          <div className="flex justify-between items-end">
                            <span className="text-sm font-bold text-gray-700">Course Progress</span>
                            <span className="text-xl font-black text-blue-600">{progressPct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3 shadow-inner overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 font-medium flex justify-between">
                            <span>{completedModules} completed</span>
                            <span>{totalModules - completedModules} remaining</span>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <div className="flex items-center gap-2 text-sm text-gray-600 font-bold mb-1 uppercase tracking-wide">
                              <span>📝</span> Avg Quiz
                            </div>
                            <div className="text-2xl font-black text-gray-900">
                              {avgQuiz !== null ? `${avgQuiz}%` : '--'}
                            </div>
                          </div>
                          <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                            <div className="flex items-center gap-2 text-sm text-orange-800 font-bold mb-1 uppercase tracking-wide">
                              <span>🏆</span> Mod Certs
                            </div>
                            <div className="text-2xl font-black text-orange-600">
                              {modCerts} <span className="text-sm text-orange-400 font-medium">earned</span>
                            </div>
                          </div>
                        </div>

                        {/* CTA Button */}
                        <button
                          onClick={() => window.location.href = `/course/${enrollment.course?._id}`}
                          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-lg shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-2 relative z-10 group-hover:-translate-y-1"
                        >
                          {progressPct === 0 ? "Start Learning" : progressPct === 100 ? "Review Course" : "Continue Learning"}
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </button>

                        {/* Decorative Background Blob */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50 z-0 pointer-events-none group-hover:bg-indigo-100 transition-colors duration-500" />
                      </div>
                    );
                  })}
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