import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PreTest from './PreTest';
import axios from 'axios';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const fallbackThumbnail = 'https://placehold.co/600x400?text=Course+Thumbnail';

  // Pre-test modal state
  const [showPreTest, setShowPreTest] = useState(false);
  const [preTestGatePage, setPreTestGatePage] = useState(false);
  const [selectedCourseForPreTest, setSelectedCourseForPreTest] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/courses');
        const coursesData = res.data || [];
        
        // For each course, if it has pretest, fetch the full pretest data
        const enrichedCourses = await Promise.all(
          coursesData.map(async (course) => {
            if (course.preTest) {
              try {
                // Pretest data is already included in course from backend
                return course;
              } catch (err) {
                console.error('Error fetching pretest for course:', course._id, err);
                return course;
              }
            }
            return course;
          })
        );
        
        setCourses(enrichedCourses);
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleEnrollClick = async (course) => {
    if (!user) {
      // Redirect to login if not authenticated
      navigate('/login');
      return;
    }

    setEnrollLoading(true);
    console.log('Enroll clicked for course:', course);
    console.log('Course has preTest:', !!course.preTest);
    
    try {
      // Fetch the full course details to ensure pretest data is available
      const { data: fullCourse } = await axios.get(`/courses/${course._id}`);
      console.log('Full course data:', fullCourse);
      console.log('Full course preTest:', fullCourse.preTest);
      
      // Always show pre-test gate page for any course
      // This gives user the option to take the pre-test
      setSelectedCourseForPreTest(fullCourse);
      setPreTestGatePage(true);
    } catch (error) {
      console.error('Error fetching course details:', error);
      // Fall back to the course data we have
      setSelectedCourseForPreTest(course);
      setPreTestGatePage(true);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleProceedToPayment = async (course) => {
    try {
      // Call checkout endpoint - don't include /api prefix (already in axios base URL)
      const { data } = await axios.post(
        '/payments/create-checkout-session',
        { courseId: course._id }
      );
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Failed to proceed with enrollment: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCancelPreTest = () => {
    setShowPreTest(false);
    setPreTestGatePage(false);
    setSelectedCourseForPreTest(null);
  };

  const handlePassedPreTest = (score) => {
    // Pre-test completed, proceed to payment
    console.log('Pre-test passed with score:', score);
    console.log('Course for payment:', selectedCourseForPreTest);
    
    if (selectedCourseForPreTest) {
      setShowPreTest(false);
      setPreTestGatePage(false);
      // Proceed directly to payment after pre-test
      handleProceedToPayment(selectedCourseForPreTest);
      setSelectedCourseForPreTest(null);
    }
  };

  const handleSkipPreTest = async () => {
    // Skip pre-test and go directly to payment
    console.log('Pre-test skipped, proceeding to payment');
    
    if (selectedCourseForPreTest) {
      setShowPreTest(false);
      setPreTestGatePage(false);
      // Proceed directly to payment without taking the test
      handleProceedToPayment(selectedCourseForPreTest);
      setSelectedCourseForPreTest(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">All Courses</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden animate-pulse">
              <div className="w-full h-48 rounded-t-2xl bg-gray-300" />
              <div className="p-6 space-y-3">
                <div className="h-6 bg-gray-300 rounded w-3/4" />
                <div className="h-4 bg-gray-300 rounded w-full" />
                <div className="h-4 bg-gray-300 rounded w-5/6" />
                <div className="flex items-center justify-between pt-4">
                  <div className="h-4 bg-gray-300 rounded w-24" />
                  <div className="h-6 bg-gray-300 rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>;
  }

  // Show pre-test gate page if selected
  if (preTestGatePage && selectedCourseForPreTest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              setPreTestGatePage(false);
              setSelectedCourseForPreTest(null);
            }}
            className="mb-6 px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold flex items-center gap-2"
          >
            ← Back to Courses
          </button>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="relative h-80 overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600">
              <img
                src={selectedCourseForPreTest.thumbnailUrl || 'https://placehold.co/800x400?text=Course'}
                onError={(e) => {
                  e.currentTarget.src = 'https://placehold.co/800x400?text=Course';
                }}
                alt={selectedCourseForPreTest.title}
                className="w-full h-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40"></div>
            </div>

            <div className="p-8 md:p-12 space-y-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                  {selectedCourseForPreTest.title}
                </h1>
                <p className="text-xl text-gray-600 mb-6">
                  {selectedCourseForPreTest.description}
                </p>

                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center text-lg font-bold">
                    {(selectedCourseForPreTest.createdBy?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedCourseForPreTest.createdBy?.name}</p>
                    <p className="text-sm text-gray-600">Course Instructor</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">📝 Pre-Test Required to Enroll</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-3">✓</div>
                    <h3 className="font-bold text-gray-900 mb-2">Quick Assessment</h3>
                    <p className="text-sm text-gray-600">
                      {(() => {
                        const preTest = selectedCourseForPreTest.preTest;
                        if (preTest?.questions?.length > 0) return preTest.questions.length;
                        if (preTest?.tests?.[0]?.questions?.length > 0) return preTest.tests[0].questions.length;
                        return 0;
                      })()} questions to evaluate your baseline knowledge
                    </p>
                  </div>

                  <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-3">🎯</div>
                    <h3 className="font-bold text-gray-900 mb-2">Personalized Path</h3>
                    <p className="text-sm text-gray-600">
                      Get recommendations tailored to your knowledge level
                    </p>
                  </div>

                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-3">🚀</div>
                    <h3 className="font-bold text-gray-900 mb-2">Full Access</h3>
                    <p className="text-sm text-gray-600">
                      Unlock all course materials and resources
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8">
                  <p className="text-amber-900">
                    <span className="font-bold">💡 Note:</span> This pre-test is diagnostic only. You'll be able to proceed with the course regardless of your score. It helps us understand where you're starting from!
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setPreTestGatePage(false);
                      setSelectedCourseForPreTest(null);
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowPreTest(true);
                      setPreTestGatePage(false);
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold hover:shadow-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <span>📝</span>
                    Start Pre-Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pre-test Modal */}
        {showPreTest && selectedCourseForPreTest && (
          <PreTest
            preTest={selectedCourseForPreTest.preTest}
            courseId={selectedCourseForPreTest._id}
            onPassedPreTest={handlePassedPreTest}
            onSkipPreTest={handleSkipPreTest}
            onCancelPreTest={() => {
              setShowPreTest(false);
              setPreTestGatePage(true);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Explore Courses</h1>
            <p className="text-gray-600 text-lg">Discover amazing learning opportunities</p>
          </div>
          {(user?.role === 'instructor' || user?.role === 'admin') && (
            <Link to="/instructor/courses/new" className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg font-semibold transition-all hover:scale-105">
              ➕ Create Course
            </Link>
          )}
        </div>

        {courses.length === 0 ? (
          <div className="bg-white border-2 border-gray-200 rounded-3xl p-16 text-center">
            <div className="text-6xl mb-4">📚</div>
            <div className="text-2xl font-bold text-gray-900 mb-2">No courses yet</div>
            <div className="text-gray-600 mb-6 text-lg">Check back later for amazing courses!</div>
            {(user?.role === 'instructor' || user?.role === 'admin') && (
              <Link to="/instructor/courses/new" className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg font-semibold">
                Create the First Course
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(c => (
              <div key={c._id} className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-blue-400 flex flex-col">
                {/* Thumbnail */}
                <div className="relative overflow-hidden h-48">
                  <img
                    src={c.thumbnailUrl || fallbackThumbnail}
                    onError={(e) => { e.currentTarget.src = fallbackThumbnail; }}
                    alt={`${c.title} thumbnail`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg shadow-lg">
                    ₹{c.priceInINR}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-bold text-xl mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">{c.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4 h-10">{c.description}</p>

                  {/* Instructor Info */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200 mb-6 flex-1">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                      {(c.createdBy?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-600">
                      <div className="font-semibold text-gray-900">{c.createdBy?.name || 'Unknown'}</div>
                      <div>Instructor</div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <Link
                      to={`/course/${c._id}`}
                      className="flex-1 text-center px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all"
                    >
                      Preview
                    </Link>
                    <button
                      onClick={() => handleEnrollClick(c)}
                      disabled={enrollLoading}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enrollLoading ? 'Loading...' : 'Enroll'}
                    </button>
                  </div>

                  {/* Pre-test Badge */}
                  {c.preTest && (
                    (c.preTest.questions?.length > 0 || c.preTest.tests?.[0]?.questions?.length > 0) && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg p-2">
                        <span>📝</span>
                        <span>Pre-test Required</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pre-test Modal */}
        {showPreTest && selectedCourseForPreTest && (
          <PreTest
            preTest={selectedCourseForPreTest.preTest}
            courseId={selectedCourseForPreTest._id}
            onPassedPreTest={handlePassedPreTest}
            onCancelPreTest={handleCancelPreTest}
          />
        )}
      </div>
    </div>
  );
};

export default Courses;


