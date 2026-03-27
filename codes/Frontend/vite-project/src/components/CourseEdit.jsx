import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Editor from "@monaco-editor/react";

const MIN_PUBLISH_PRICE_INR = 50;

const CourseEdit = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    priceInINR: 0,
    thumbnailUrl: '',
    isPublished: false,
    isFree: false
  });
  const [preTest, setPreTest] = useState({ passMarkPercent: 70, questions: [] });
  const [showPreTestForm, setShowPreTestForm] = useState(false);
  const [contents, setContents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedModule, setExpandedModule] = useState(null);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        setLoading(true);
        const [courseRes, enrollmentRes] = await Promise.all([
          axios.get(`/courses/${id}`),
          axios.get(`/courses/${id}/enrolled`)
        ]);

        const course = courseRes.data;

        setForm({
          title: course.title,
          description: course.description,
          priceInINR: course.priceInINR,
          thumbnailUrl: course.thumbnailUrl || '',
          isPublished: !!course.isPublished,
          isFree: !!course.isFree
        });

        // Handle course contents
        const formattedContents = course.contents?.map(content => {
          // Ensure all required fields are present
          if (content.type === 'section') {
            return {
              ...content,
              lessons: content.lessons || [],
              quiz: content.quiz || { questions: [], passMarkPercent: 70 },
              revisionLessons: content.revisionLessons || []
            };
          } else if (content.type === 'quiz') {
            return {
              ...content,
              quizQuestions: content.quizQuestions || [],
              passMarkPercent: content.passMarkPercent || 70
            };
          } else if (content.type === 'coding_problem') {
            return {
              ...content,
              codingProblem: content.codingProblem || {
                description: '',
                starterCode: '// Write your code here\n',
                language: 'javascript',
                testCases: []
              }
            };
          }
          return content;
        }) || [];

        setContents(formattedContents);

        // Handle pre-test data
        if (course.preTest) {
          const pretestData = course.preTest.tests?.[0] || course.preTest;
          setPreTest({
            passMarkPercent: pretestData.passMarkPercent || 70,
            questions: pretestData.questions || []
          });
        }

      } catch (err) {
        console.error('Error loading course:', err);
        setError(err.response?.data?.message || 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [id]);

  const addContent = (type) => {
    const newContent = {
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}`,
      ...(type === 'section'
        ? {
          lessons: [],
          quiz: { questions: [], passMarkPercent: 70 },
          revisionLessons: []
        }
        : type === 'quiz'
          ? { quizQuestions: [], passMarkPercent: 70 }
          : type === 'coding_problem'
            ? {
              codingProblem: {
                description: '',
                starterCode: '// Write your code here\n',
                language: 'javascript',
                testCases: []
              }
            }
            : { url: '' }
      )
    };
    setContents(prev => [...prev, newContent]);
  };

  const updateContent = (idx, field, value) => {
    setContents(prev =>
      prev.map((it, i) =>
        i === idx ? { ...it, [field]: value } : it
      )
    );
  };

  const removeContent = (idx) => {
    if (window.confirm('Are you sure you want to remove this item? This cannot be undone.')) {
      setContents(prev => prev.filter((_, i) => i !== idx));
    }
  };

  // Section content management
  const addLessonToSection = (sectionIdx, type = 'video') => {
    const newLesson = {
      type,
      title: `New ${type}`,
      url: '',

      ...(type === 'video' && { durationMinutes: 0 }),
      ...(type === 'code' && {
        codingProblem: {
          description: '',
          starterCode: '// Write your code here\n',
          language: 'javascript',
          testCases: []
        }
      })
    };

    setContents(prev =>
      prev.map((item, i) =>
        i === sectionIdx
          ? {
            ...item,
            lessons: [...(item.lessons || []), newLesson]
          }
          : item
      )
    );
  };

  const updateLessonInSection = (sectionIdx, lessonIdx, field, value) => {
    setContents(prev =>
      prev.map((section, i) => {
        if (i !== sectionIdx) return section;
        const updatedLessons = [...(section.lessons || [])];
        updatedLessons[lessonIdx] = { ...updatedLessons[lessonIdx], [field]: value };
        return { ...section, lessons: updatedLessons };
      })
    );
  };

  const removeLessonFromSection = (sectionIdx, lessonIdx) => {
    if (window.confirm('Remove this lesson?')) {
      setContents(prev =>
        prev.map((section, i) =>
          i === sectionIdx
            ? {
              ...section,
              lessons: (section.lessons || []).filter((_, j) => j !== lessonIdx)
            }
            : section
        )
      );
    }
  };

  // Revision content management
  const addRevisionLesson = (sectionIdx, type = 'video') => {
    const newLesson = {
      type,
      title: `New Revision ${type}`,
      url: '',
      ...(type === 'video' && { durationMinutes: 0 })
    };

    setContents(prev =>
      prev.map((item, i) =>
        i === sectionIdx
          ? {
            ...item,
            revisionLessons: [...(item.revisionLessons || []), newLesson]
          }
          : item
      )
    );
  };

  const updateRevisionLesson = (sectionIdx, lessonIdx, field, value) => {
    setContents(prev =>
      prev.map((section, i) => {
        if (i !== sectionIdx) return section;
        const updatedLessons = [...(section.revisionLessons || [])];
        updatedLessons[lessonIdx] = { ...updatedLessons[lessonIdx], [field]: value };
        return { ...section, revisionLessons: updatedLessons };
      })
    );
  };

  const removeRevisionLesson = (sectionIdx, lessonIdx) => {
    if (window.confirm('Remove this revision lesson?')) {
      setContents(prev =>
        prev.map((section, i) =>
          i === sectionIdx
            ? {
              ...section,
              revisionLessons: (section.revisionLessons || []).filter((_, j) => j !== lessonIdx)
            }
            : section
        )
      );
    }
  };

  // Quiz question management
  const addQuizQuestion = (contentIdx) => {
    setContents(prev =>
      prev.map((item, i) =>
        i === contentIdx
          ? {
            ...item,
            quizQuestions: [
              ...(item.quizQuestions || []),
              { question: '', options: ['', ''], correctIndex: 0 }
            ]
          }
          : item
      )
    );
  };

  const updateQuizQuestion = (contentIdx, questionIdx, field, value) => {
    setContents(prev =>
      prev.map((item, i) => {
        if (i !== contentIdx) return item;
        const updatedQuestions = [...(item.quizQuestions || [])];
        updatedQuestions[questionIdx] = { ...updatedQuestions[questionIdx], [field]: value };
        return { ...item, quizQuestions: updatedQuestions };
      })
    );
  };

  const addQuizOption = (contentIdx, questionIdx) => {
    setContents(prev =>
      prev.map((item, i) => {
        if (i !== contentIdx) return item;
        const updatedQuestions = [...(item.quizQuestions || [])];
        updatedQuestions[questionIdx] = {
          ...updatedQuestions[questionIdx],
          options: [...(updatedQuestions[questionIdx].options || []), '']
        };
        return { ...item, quizQuestions: updatedQuestions };
      })
    );
  };

  const updateQuizOption = (contentIdx, questionIdx, optionIdx, value) => {
    setContents(prev =>
      prev.map((item, i) => {
        if (i !== contentIdx) return item;
        const updatedQuestions = [...(item.quizQuestions || [])];
        const updatedOptions = [...(updatedQuestions[questionIdx]?.options || [])];
        updatedOptions[optionIdx] = value;
        updatedQuestions[questionIdx] = {
          ...updatedQuestions[questionIdx],
          options: updatedOptions
        };
        return { ...item, quizQuestions: updatedQuestions };
      })
    );
  };

  const removeQuizQuestion = (contentIdx, questionIdx) => {
    if (window.confirm('Remove this question?')) {
      setContents(prev =>
        prev.map((item, i) =>
          i === contentIdx
            ? {
              ...item,
              quizQuestions: (item.quizQuestions || []).filter((_, j) => j !== questionIdx)
            }
            : item
        )
      );
    }
  };

  // Coding Problem Management
  const updateCodingProblem = (idx, field, value) => {
    setContents(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        return {
          ...item,
          codingProblem: {
            ...item.codingProblem,
            [field]: value
          }
        };
      })
    );
  };

  const addTestCase = (idx) => {
    setContents(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        return {
          ...item,
          codingProblem: {
            ...item.codingProblem,
            testCases: [...(item.codingProblem?.testCases || []), { input: '', expectedOutput: '' }]
          }
        };
      })
    );
  };

  const updateTestCase = (idx, tcIdx, field, value) => {
    setContents(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const newTestCases = [...(item.codingProblem?.testCases || [])];
        newTestCases[tcIdx] = { ...newTestCases[tcIdx], [field]: value };
        return {
          ...item,
          codingProblem: {
            ...item.codingProblem,
            testCases: newTestCases
          }
        };
      })
    );
  };

  const removeTestCase = (idx, tcIdx) => {
    setContents(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        return {
          ...item,
          codingProblem: {
            ...item.codingProblem,
            testCases: (item.codingProblem?.testCases || []).filter((_, j) => j !== tcIdx)
          }
        };
      })
    );
  };

  // Pre-test functions
  const addPreTestQuestion = () => {
    setPreTest(prev => ({
      ...prev,
      questions: [...(prev.questions || []), { question: '', options: ['', '', '', ''], correctIndex: 0 }]
    }));
  };

  const updatePreTestQuestion = (qIdx, field, value) => {
    setPreTest(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === qIdx ? { ...q, [field]: value } : q)
    }));
  };

  const updatePreTestOption = (qIdx, oIdx, value) => {
    setPreTest(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          options: q.options.map((opt, j) => j === oIdx ? value : opt)
        };
      })
    }));
  };

  const removePreTestQuestion = (qIdx) => {
    setPreTest(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== qIdx)
    }));
  };

  const ensureQuizDefaults = (idx) => {
    setContents(prev => prev.map((it, i) => i === idx ? ({
      ...it,
      type: 'quiz',
      title: it.title || 'Quiz',
      passMarkPercent: it.passMarkPercent || 70,
      quizQuestions: Array.isArray(it.quizQuestions) ? it.quizQuestions : []
    }) : it));
  };

  const handleTypeChange = (idx, type) => {
    if (type === 'quiz') {
      ensureQuizDefaults(idx);
    } else {
      setContents(prev => prev.map((it, i) => i === idx ? ({ ...it, type }) : it));
    }
  };

  const handlePublishToggle = (checked) => {
    setError('');
    if (checked && !form.isFree && Number(form.priceInINR) < MIN_PUBLISH_PRICE_INR) {
      setError(`To publish, set price ≥ ₹${MIN_PUBLISH_PRICE_INR} or make the course Free.`);
      setForm({ ...form, isPublished: false });
      return;
    }
    setForm({ ...form, isPublished: checked });
  };

  const handleFreeToggle = (checked) => {
    setError('');
    setForm({ ...form, isFree: checked, priceInINR: checked ? 0 : form.priceInINR });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.isPublished && !form.isFree && Number(form.priceInINR) < MIN_PUBLISH_PRICE_INR) {
      setError(`Published courses must be priced at least ₹${MIN_PUBLISH_PRICE_INR} unless marked as Free.`);
      return;
    }
    setSaving(true);
    try {
      // Process contents to ensure all sections have the correct structure
      const processedContents = contents.map(content => {
        if (content.type === 'section') {
          return {
            ...content,
            lessons: content.lessons || [],
            quiz: content.quiz || { questions: [], passMarkPercent: 70 },
            revisionLessons: content.revisionLessons || []
          };
        } else if (content.type === 'quiz') {
          return {
            ...content,
            quizQuestions: content.quizQuestions || [],
            passMarkPercent: content.passMarkPercent || 70
          };
        } else if (content.type === 'coding_problem') {
          return {
            ...content,
            codingProblem: content.codingProblem || {
              description: '',
              starterCode: '// Write your code here\n',
              language: 'javascript',
              testCases: []
            }
          };
        }
        return content;
      });

      const payload = {
        title: form.title,
        description: form.description,
        priceInINR: form.isFree ? 0 : form.priceInINR,
        thumbnailUrl: form.thumbnailUrl,
        isPublished: form.isPublished,
        isFree: form.isFree,
        contents: processedContents,
        preTest: preTest && preTest.questions && preTest.questions.length > 0 ? {
          passMarkPercent: preTest.passMarkPercent || 70,
          questions: preTest.questions
        } : undefined
      };

      console.log('Updating course with payload:', payload);

      const response = await axios.put(`/courses/${id}`, payload);

      console.log('Course updated successfully:', response.data);
      navigate(`/course/${id}`);
    } catch (err) {
      console.error('Error updating course:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'instructor' && user?.role !== 'admin') {
    return <div className="max-w-4xl mx-auto p-6">You do not have access.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg p-8 border-2 border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Edit Course</h1>
              <p className="text-gray-600">Manage your course content and settings</p>
            </div>
            <span className={`px-4 py-2 text-sm rounded-full font-semibold border-2 ${form.isPublished ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
              {form.isPublished ? '✓ Published' : '📝 Draft'}
            </span>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-800">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-8">
            {/* Course Basics */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span>📋</span>
                Course Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">📚 Title</label>
                  <input
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all"
                    placeholder="Enter course title"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">💰 Price (INR)</label>
                  <input
                    type="number"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="Minimum ₹50 for published"
                    value={form.priceInINR}
                    disabled={form.isFree}
                    onChange={e => setForm({ ...form, priceInINR: Number(e.target.value) })}
                  />
                  {form.isPublished && !form.isFree && Number(form.priceInINR) < MIN_PUBLISH_PRICE_INR && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">⚠️ Price must be ≥ ₹{MIN_PUBLISH_PRICE_INR} to publish.</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">🖼️ Thumbnail URL</label>
                <input
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all"
                  placeholder="https://..."
                  value={form.thumbnailUrl}
                  onChange={e => setForm({ ...form, thumbnailUrl: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">📝 Description</label>
                <textarea
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all"
                  rows={4}
                  placeholder="Describe what students will learn..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <label className="flex-1 inline-flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200 cursor-pointer hover:border-blue-400 transition-all">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-2 border-blue-600 cursor-pointer"
                    checked={form.isPublished}
                    onChange={e => handlePublishToggle(e.target.checked)}
                  />
                  <span className="font-semibold text-gray-900">Publish this course to make it visible to students</span>
                </label>
                <label className="flex-1 inline-flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border-2 border-emerald-200 cursor-pointer hover:border-emerald-400 transition-all">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-2 border-emerald-600 cursor-pointer"
                    checked={form.isFree}
                    onChange={e => handleFreeToggle(e.target.checked)}
                  />
                  <span className="font-semibold text-gray-900">Make this course free</span>
                </label>
              </div>
            </div>

            {/* Pre-Test Section */}
            <div className="space-y-6 border-t-2 border-gray-200 pt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span>📝</span>
                  Pre-Test ({preTest.questions?.length || 0} questions)
                </h2>
                <button
                  type="button"
                  onClick={() => setShowPreTestForm(!showPreTestForm)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  {showPreTestForm ? '✕ Close' : '✎ Edit Pre-Test'}
                </button>
              </div>

              {showPreTestForm && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 space-y-6">
                  {/* Pass Mark */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">📊 Passing Percentage</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-600 transition-all"
                      value={preTest.passMarkPercent || 70}
                      onChange={e => setPreTest(prev => ({ ...prev, passMarkPercent: Number(e.target.value) }))}
                    />
                    <p className="text-xs text-amber-700 mt-2">Students must score this percentage to pass and proceed to payment</p>
                  </div>

                  {/* Questions */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Questions</h3>
                      <button
                        type="button"
                        onClick={addPreTestQuestion}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-all"
                      >
                        ➕ Add Question
                      </button>
                    </div>

                    <div className="space-y-4">
                      {preTest.questions?.map((q, qIdx) => (
                        <div key={qIdx} className="bg-white rounded-xl p-5 border-2 border-amber-200 space-y-4">
                          {/* Question Text */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Question {qIdx + 1}</label>
                            <textarea
                              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-amber-600 focus:outline-none"
                              rows="2"
                              placeholder="Enter the question"
                              value={q.question}
                              onChange={e => updatePreTestQuestion(qIdx, 'question', e.target.value)}
                            />
                          </div>

                          {/* Options */}
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-900">Options (select correct answer)</label>
                            {q.options?.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name={`correct-${qIdx}`}
                                  checked={q.correctIndex === oIdx}
                                  onChange={() => updatePreTestQuestion(qIdx, 'correctIndex', oIdx)}
                                  className="w-4 h-4 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-amber-600 focus:outline-none"
                                  placeholder={`Option ${oIdx + 1}`}
                                  value={opt}
                                  onChange={e => updatePreTestOption(qIdx, oIdx, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removePreTestQuestion(qIdx)}
                            className="w-full px-4 py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition-all"
                          >
                            🗑️ Remove Question
                          </button>
                        </div>
                      ))}

                      {(!preTest.questions || preTest.questions.length === 0) && (
                        <div className="bg-white rounded-xl p-6 border-2 border-dashed border-amber-300 text-center">
                          <p className="text-gray-600">No pre-test questions added yet. Click "Add Question" to get started!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modules Section */}
            <div className="space-y-6 border-t-2 border-gray-200 pt-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📦</span>
                  Modules & Content ({contents.length})
                </h2>
                <div className="flex gap-3 flex-wrap">
                  <button type="button" onClick={() => setContents(prev => [...prev, { type: 'section', title: 'New Module', lessons: [], quiz: { passMarkPercent: 70, questions: [] }, revisionLessons: [] }])} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                    ➕ Add Module (Section)
                  </button>
                  <button type="button" onClick={() => setContents(prev => [...prev, { type: 'video', title: 'New Video', url: '' }])} className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-900 rounded-lg font-semibold hover:border-blue-400 transition-all">
                    🎥 Add Video
                  </button>
                  <button type="button" onClick={() => setContents(prev => [...prev, { type: 'pdf', title: 'New PDF', url: '' }])} className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-900 rounded-lg font-semibold hover:border-blue-400 transition-all">
                    📄 Add PDF
                  </button>
                  <button type="button" onClick={() => addContent('coding_problem')} className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-900 rounded-lg font-semibold hover:border-blue-400 transition-all">
                    💻 Add Coding Problem
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {contents.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                    <div className="text-4xl mb-2">📚</div>
                    <p className="text-gray-600">No modules added yet. Start by adding a module above.</p>
                  </div>
                ) : (
                  contents.map((item, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-2xl p-6 space-y-4 hover:border-blue-400 transition-all">
                      {/* Module Header */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <select
                            className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg font-semibold focus:border-blue-600 focus:outline-none"
                            value={item.type}
                            onChange={e => handleTypeChange(idx, e.target.value)}
                          >
                            <option value="section">📦 Module/Section</option>
                            <option value="video">🎥 Video</option>
                            <option value="pdf">📄 PDF</option>
                            <option value="note">📝 Note</option>
                            <option value="quiz">❓ Quiz</option>
                            <option value="coding_problem">💻 Coding Problem</option>
                          </select>
                          <input
                            className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-semibold focus:border-blue-600 focus:outline-none"
                            placeholder="Title"
                            value={item.title || ''}
                            onChange={e => updateContent(idx, 'title', e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeContent(idx)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition-all"
                        >
                          🗑️ Remove
                        </button>
                      </div>

                      {/* URL for non-quiz/non-coding items */}
                      {item.type !== 'quiz' && item.type !== 'section' && item.type !== 'coding_problem' && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">Content URL</label>
                          <input
                            className="w-full px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                            placeholder="https://..."
                            value={item.url || ''}
                            onChange={e => updateContent(idx, 'url', e.target.value)}
                          />
                        </div>
                      )}

                      {/* Coding Problem Configuration */}
                      {item.type === 'coding_problem' && (
                        <div className="bg-white rounded-xl p-4 space-y-4 border-2 border-indigo-200">
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Problem Description</label>
                            <textarea
                              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-600 focus:outline-none"
                              rows={3}
                              placeholder="Describe the problem..."
                              value={item.codingProblem?.description || ''}
                              onChange={e => updateCodingProblem(idx, 'description', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Starter Code</label>
                            <div className="border-2 border-gray-300 rounded-lg overflow-hidden h-[200px] focus-within:border-indigo-600 transition-all">
                              <Editor
                                height="100%"
                                language={item.codingProblem?.language || "javascript"}
                                value={item.codingProblem?.starterCode || ''}
                                theme="vs-dark"
                                options={{
                                  minimap: { enabled: false },
                                  fontSize: 14,
                                  scrollBeyondLastLine: false,
                                  tabSize: 2,
                                }}
                                onChange={(value) => updateCodingProblem(idx, 'starterCode', value)}
                              />
                            </div>
                          </div>


                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                <span>🧪</span> Test Cases ({(item.codingProblem?.testCases || []).length})
                              </h4>
                              <button
                                type="button"
                                onClick={() => addTestCase(idx)}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all"
                              >
                                + Add Test Case
                              </button>
                            </div>

                            <div className="space-y-3">
                              {(item.codingProblem?.testCases || []).map((tc, tcIdx) => (
                                <div key={tcIdx} className="bg-indigo-50 border-2 border-indigo-100 rounded-xl p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-bold text-gray-900 text-sm">Test Case {tcIdx + 1}</h5>
                                    <button
                                      type="button"
                                      onClick={() => removeTestCase(idx, tcIdx)}
                                      className="text-red-600 hover:text-red-700 font-bold"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-700 mb-1">Input</label>
                                      <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-600 focus:outline-none font-mono text-sm"
                                        rows={2}
                                        placeholder="Input data..."
                                        value={tc.input}
                                        onChange={e => updateTestCase(idx, tcIdx, 'input', e.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-700 mb-1">Expected Output</label>
                                      <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-600 focus:outline-none font-mono text-sm"
                                        rows={2}
                                        placeholder="Expected output..."
                                        value={tc.expectedOutput}
                                        onChange={e => updateTestCase(idx, tcIdx, 'expectedOutput', e.target.value)}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {(item.codingProblem?.testCases || []).length === 0 && (
                                <p className="text-sm text-gray-500 italic">No test cases added.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quiz Configuration */}
                      {item.type === 'quiz' && (
                        <div className="bg-white rounded-xl p-4 space-y-4 border-2 border-amber-200">
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Pass Mark Percentage</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                              value={item.passMarkPercent || 70}
                              onChange={e => updateContent(idx, 'passMarkPercent', Number(e.target.value))}
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                <span>❓</span>
                                Questions ({(item.quizQuestions || []).length})
                              </h4>
                              <button
                                type="button"
                                onClick={() => addQuizQuestion(idx)}
                                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                              >
                                + Add Question
                              </button>
                            </div>

                            <div className="space-y-3">
                              {(item.quizQuestions || []).map((q, qi) => (
                                <div key={qi} className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-bold text-gray-900">Question {qi + 1}</h5>
                                    <button
                                      type="button"
                                      onClick={() => removeQuizQuestion(idx, qi)}
                                      className="text-red-600 hover:text-red-700 font-bold"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  <input
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                                    placeholder="Question text"
                                    value={q.question}
                                    onChange={e => updateQuizQuestion(idx, qi, 'question', e.target.value)}
                                  />
                                  <div className="space-y-2">
                                    {(q.options || []).map((opt, oi) => (
                                      <div key={oi} className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name={`correct-${idx}-${qi}`}
                                          checked={q.correctIndex === oi}
                                          onChange={() => updateQuizQuestion(idx, qi, 'correctIndex', oi)}
                                          className="w-4 h-4 cursor-pointer"
                                        />
                                        <input
                                          className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                                          placeholder={`Option ${oi + 1}`}
                                          value={opt}
                                          onChange={e => updateQuizOption(idx, qi, oi, e.target.value)}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addQuizOption(idx, qi)}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-all"
                                  >
                                    + Add Option
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section Configuration */}
                      {item.type === 'section' && (
                        <div className="bg-white rounded-xl p-4 space-y-6 border-2 border-green-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">📌 <span className="font-semibold">Module Content</span></p>
                              <p className="text-xs text-gray-500">Manage lessons, quiz, and revision materials</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedModule(expandedModule === idx ? null : idx)}
                              className={`px-4 py-2 rounded-lg font-semibold transition-all ${expandedModule === idx ? 'bg-gray-200 text-gray-800' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            >
                              {expandedModule === idx ? '▲ Collapse' : '▼ Edit Content'}
                            </button>
                          </div>

                          {expandedModule === idx && (
                            <div className="space-y-8 pt-4 border-t-2 border-gray-100">
                              {/* 1. Lessons */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                    <span>�</span> Lessons ({(item.lessons || []).length})
                                  </h4>
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => addLessonToSection(idx, 'video')} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100">+ Video</button>
                                    <button type="button" onClick={() => addLessonToSection(idx, 'pdf')} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100">+ PDF</button>
                                    <button type="button" onClick={() => addLessonToSection(idx, 'note')} className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-lg text-sm font-semibold hover:bg-yellow-100">+ Note</button>
                                    <button type="button" onClick={() => addLessonToSection(idx, 'code')} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-100">+ Code</button>
                                  </div>
                                </div>

                                <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                                  {(item.lessons || []).map((lesson, lIdx) => (
                                    <div key={lIdx} className="bg-gray-50 rounded-lg p-3 space-y-3">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl">{lesson.type === 'video' ? '🎥' : lesson.type === 'pdf' ? '📄' : lesson.type === 'code' ? '💻' : '📝'}</span>
                                        <input
                                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                                          placeholder="Lesson Title"
                                          value={lesson.title}
                                          onChange={e => updateLessonInSection(idx, lIdx, 'title', e.target.value)}
                                        />
                                        <button type="button" onClick={() => removeLessonFromSection(idx, lIdx)} className="text-red-500 hover:text-red-700">🗑️</button>
                                      </div>

                                      {
                                        lesson.type === 'code' ? (
                                          <div className="space-y-3 pt-2">
                                            <div className="flex gap-2">
                                              <textarea
                                                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:border-indigo-500 focus:outline-none"
                                                placeholder="Problem Description"
                                                rows={2}
                                                value={lesson.codingProblem?.description || ''}
                                                onChange={e => {
                                                  const updatedLessons = [...(item.lessons || [])];
                                                  if (!updatedLessons[lIdx].codingProblem) updatedLessons[lIdx].codingProblem = {};
                                                  updatedLessons[lIdx].codingProblem.description = e.target.value;
                                                  updateContent(idx, 'lessons', updatedLessons);
                                                }}
                                              />
                                              <div className="w-24">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Points</label>
                                                <input
                                                  type="number"
                                                  className="w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-sm focus:border-indigo-500 focus:outline-none"
                                                  value={lesson.codingProblem?.points || 10}
                                                  onChange={e => {
                                                    const updatedLessons = [...(item.lessons || [])];
                                                    if (!updatedLessons[lIdx].codingProblem) updatedLessons[lIdx].codingProblem = {};
                                                    updatedLessons[lIdx].codingProblem.points = parseInt(e.target.value) || 0;
                                                    updateContent(idx, 'lessons', updatedLessons);
                                                  }}
                                                />
                                              </div>
                                            </div>

                                            <div className="border border-gray-300 rounded-md overflow-hidden h-[150px] focus-within:border-indigo-500 transition-all">
                                              <Editor
                                                height="100%"
                                                language={lesson.codingProblem?.language || "javascript"}
                                                value={lesson.codingProblem?.starterCode || ''}
                                                theme="vs-dark"
                                                options={{
                                                  minimap: { enabled: false },
                                                  fontSize: 12,
                                                  scrollBeyondLastLine: false,
                                                  tabSize: 2,
                                                }}
                                                onChange={(value) => {
                                                  const updatedLessons = [...(item.lessons || [])];
                                                  updatedLessons[lIdx] = {
                                                    ...updatedLessons[lIdx],
                                                    codingProblem: { ...updatedLessons[lIdx].codingProblem, starterCode: value }
                                                  };
                                                  updateContent(idx, 'lessons', updatedLessons);
                                                }}
                                              />
                                            </div>
                                            {/* Simple Test Case Editor for Lessons */}
                                            <div className="space-y-2">
                                              <div className="flex justify-between items-center">
                                                <label className="text-xs font-semibold text-gray-600">Test Cases</label>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const updatedLessons = [...(item.lessons || [])];
                                                    const currentTC = updatedLessons[lIdx].codingProblem?.testCases || [];
                                                    updatedLessons[lIdx] = {
                                                      ...updatedLessons[lIdx],
                                                      codingProblem: { ...updatedLessons[lIdx].codingProblem, testCases: [...currentTC, { input: '', expectedOutput: '' }] }
                                                    };
                                                    updateContent(idx, 'lessons', updatedLessons);
                                                  }}
                                                  className="text-xs text-indigo-600 hover:underline"
                                                >
                                                  + Add Case
                                                </button>
                                              </div>
                                              {(lesson.codingProblem?.testCases || []).map((tc, tcIdx) => (
                                                <div key={tcIdx} className="flex gap-2 items-start">
                                                  <input
                                                    className="flex-1 px-2 py-1 text-xs border rounded"
                                                    placeholder="Input"
                                                    value={tc.input}
                                                    onChange={e => {
                                                      const updatedLessons = [...(item.lessons || [])];
                                                      const newTC = [...updatedLessons[lIdx].codingProblem.testCases];
                                                      newTC[tcIdx] = { ...newTC[tcIdx], input: e.target.value };
                                                      updatedLessons[lIdx].codingProblem.testCases = newTC;
                                                      updateContent(idx, 'lessons', updatedLessons);
                                                    }}
                                                  />
                                                  <input
                                                    className="flex-1 px-2 py-1 text-xs border rounded"
                                                    placeholder="Output"
                                                    value={tc.expectedOutput}
                                                    onChange={e => {
                                                      const updatedLessons = [...(item.lessons || [])];
                                                      const newTC = [...updatedLessons[lIdx].codingProblem.testCases];
                                                      newTC[tcIdx] = { ...newTC[tcIdx], expectedOutput: e.target.value };
                                                      updatedLessons[lIdx].codingProblem.testCases = newTC;
                                                      updateContent(idx, 'lessons', updatedLessons);
                                                    }}
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const updatedLessons = [...(item.lessons || [])];
                                                      const newTC = updatedLessons[lIdx].codingProblem.testCases.filter((_, i) => i !== tcIdx);
                                                      updatedLessons[lIdx].codingProblem.testCases = newTC;
                                                      updateContent(idx, 'lessons', updatedLessons);
                                                    }}
                                                    className="text-red-500 hover:text-red-700"
                                                  >
                                                    ✕
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ) : (
                                          <input
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                                            placeholder={lesson.type === 'note' ? 'Enter note content...' : 'Content URL (https://...)'}
                                            value={lesson.url || ''}
                                            onChange={e => updateLessonInSection(idx, lIdx, 'url', e.target.value)}
                                          />
                                        )
                                      }
                                    </div>
                                  ))}
                                  {(item.lessons || []).length === 0 && <p className="text-sm text-gray-400 italic">No lessons added yet.</p>}
                                </div>
                              </div>

                              {/* 2. Section Quiz */}
                              <div className="space-y-4">
                                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                  <span>❓</span> Section Quiz (Mandatory)
                                </h4>
                                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-4">
                                  {/* Pass mark + max attempts */}
                                  <div className="flex flex-wrap gap-6">
                                    <div>
                                      <label className="block text-xs font-bold text-amber-800 uppercase mb-1">Pass Mark %</label>
                                      <input
                                        type="number"
                                        min="0" max="100"
                                        className="w-24 px-3 py-2 bg-white border border-amber-300 rounded-md text-sm focus:border-amber-500 focus:outline-none"
                                        value={item.quiz?.passMarkPercent || 70}
                                        onChange={e => {
                                          const newQuiz = { ...(item.quiz || {}), passMarkPercent: Number(e.target.value) };
                                          updateContent(idx, 'quiz', newQuiz);
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-amber-800 uppercase mb-1">Max Attempts (1–10)</label>
                                      <input
                                        type="number"
                                        min="1" max="10"
                                        className="w-24 px-3 py-2 bg-white border border-amber-300 rounded-md text-sm focus:border-amber-500 focus:outline-none"
                                        value={item.quiz?.maxAttempts ?? 3}
                                        onChange={e => {
                                          const newQuiz = { ...(item.quiz || {}), maxAttempts: Math.min(10, Math.max(1, Number(e.target.value))) };
                                          updateContent(idx, 'quiz', newQuiz);
                                        }}
                                      />
                                      <p className="text-xs text-amber-700 mt-1">Students get this many tries before the quiz locks.</p>
                                    </div>
                                  </div>

                                  {/* Question Sets — one per attempt */}
                                  {/* Set 1 always shown (uses quiz.questions for backward compat) */}
                                  {/* Additional sets stored in quiz.questionSets */}
                                  {(() => {
                                    const quiz = item.quiz || {};
                                    // Build a unified array of all sets for the UI:
                                    // [quiz.questions (set 1), ...quiz.questionSets (sets 2+)]
                                    const allSets = [
                                      quiz.questions || [],
                                      ...(quiz.questionSets || [])
                                    ];

                                    const updateSet = (setIdx, newQs) => {
                                      if (setIdx === 0) {
                                        updateContent(idx, 'quiz', { ...quiz, questions: newQs });
                                      } else {
                                        const newSets = [...(quiz.questionSets || [])];
                                        newSets[setIdx - 1] = newQs;
                                        updateContent(idx, 'quiz', { ...quiz, questionSets: newSets });
                                      }
                                    };

                                    const addSet = () => {
                                      const newSets = [...(quiz.questionSets || []), [{ question: '', options: ['', '', '', ''], correctIndex: 0 }]];
                                      updateContent(idx, 'quiz', { ...quiz, questionSets: newSets });
                                    };

                                    const removeSet = (setIdx) => {
                                      if (setIdx === 0) return; // Can't remove set 1
                                      const newSets = (quiz.questionSets || []).filter((_, i) => i !== setIdx - 1);
                                      updateContent(idx, 'quiz', { ...quiz, questionSets: newSets });
                                    };

                                    return (
                                      <div className="space-y-4">
                                        {allSets.map((qs, setIdx) => (
                                          <div key={setIdx} className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                                            {/* Set header */}
                                            <div className="flex items-center justify-between px-4 py-2 bg-amber-100 border-b border-amber-200">
                                              <span className="text-xs font-bold text-amber-900 uppercase">
                                                📋 Set {setIdx + 1} — Attempt {setIdx + 1}
                                                {setIdx === 0 && <span className="ml-2 text-amber-600 font-normal">(always used on first attempt)</span>}
                                              </span>
                                              {setIdx > 0 && (
                                                <button
                                                  type="button"
                                                  onClick={() => removeSet(setIdx)}
                                                  className="text-red-500 text-xs hover:underline"
                                                >
                                                  Remove Set
                                                </button>
                                              )}
                                            </div>

                                            {/* Questions within this set */}
                                            <div className="p-3 space-y-3">
                                              {qs.map((q, qIdx) => (
                                                <div key={qIdx} className="bg-amber-50 rounded-lg p-3 border border-amber-100 space-y-2">
                                                  <div className="flex justify-between">
                                                    <span className="text-xs font-bold text-gray-500">Question {qIdx + 1}</span>
                                                    <button
                                                      type="button"
                                                      onClick={() => updateSet(setIdx, qs.filter((_, i) => i !== qIdx))}
                                                      className="text-red-500 text-xs hover:underline"
                                                    >
                                                      Remove
                                                    </button>
                                                  </div>
                                                  <input
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:border-amber-500 focus:outline-none"
                                                    placeholder="Question?"
                                                    value={q.question}
                                                    onChange={e => {
                                                      const newQs = [...qs];
                                                      newQs[qIdx] = { ...newQs[qIdx], question: e.target.value };
                                                      updateSet(setIdx, newQs);
                                                    }}
                                                  />
                                                  <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                                                    {(q.options || []).map((opt, oIdx) => (
                                                      <div key={oIdx} className="flex items-center gap-2">
                                                        <input
                                                          type="radio"
                                                          name={`s-quiz-${idx}-s${setIdx}-q${qIdx}`}
                                                          checked={q.correctIndex === oIdx}
                                                          onChange={() => {
                                                            const newQs = [...qs];
                                                            newQs[qIdx] = { ...newQs[qIdx], correctIndex: oIdx };
                                                            updateSet(setIdx, newQs);
                                                          }}
                                                        />
                                                        <input
                                                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:border-amber-500 focus:outline-none"
                                                          placeholder={`Option ${oIdx + 1}`}
                                                          value={opt}
                                                          onChange={e => {
                                                            const newQs = [...qs];
                                                            const newOptions = [...newQs[qIdx].options];
                                                            newOptions[oIdx] = e.target.value;
                                                            newQs[qIdx] = { ...newQs[qIdx], options: newOptions };
                                                            updateSet(setIdx, newQs);
                                                          }}
                                                        />
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              ))}

                                              <button
                                                type="button"
                                                onClick={() => updateSet(setIdx, [...qs, { question: '', options: ['', '', '', ''], correctIndex: 0 }])}
                                                className="w-full py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-semibold hover:bg-amber-200"
                                              >
                                                + Add Question to Set {setIdx + 1}
                                              </button>
                                            </div>
                                          </div>
                                        ))}

                                        {/* Add another set */}
                                        <button
                                          type="button"
                                          onClick={addSet}
                                          className="w-full py-2 border-2 border-dashed border-amber-300 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-50"
                                        >
                                          ➕ Add Question Set for Attempt {allSets.length + 1}
                                        </button>
                                        {allSets.length === 1 && (
                                          <p className="text-xs text-amber-600">💡 Add more sets so students get different questions on each retry.</p>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* 3. Revision Materials */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                    <span>🛡️</span> Revision Materials ({(item.revisionLessons || []).length})
                                  </h4>
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => addRevisionLesson(idx, 'video')} className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-100">+ Video</button>
                                    <button type="button" onClick={() => addRevisionLesson(idx, 'pdf')} className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-100">+ PDF</button>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">These materials are shown to students who fail the section quiz.</p>

                                <div className="space-y-3 pl-4 border-l-2 border-purple-200">
                                  {(item.revisionLessons || []).map((rev, rIdx) => (
                                    <div key={rIdx} className="bg-purple-50 rounded-lg p-3 space-y-3 border border-purple-100">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl">{rev.type === 'video' ? '🎥' : '📄'}</span>
                                        <input
                                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:border-purple-500 focus:outline-none"
                                          placeholder="Revision Title"
                                          value={rev.title}
                                          onChange={e => updateRevisionLesson(idx, rIdx, 'title', e.target.value)}
                                        />
                                        <button type="button" onClick={() => removeRevisionLesson(idx, rIdx)} className="text-red-500 hover:text-red-700">🗑️</button>
                                      </div>
                                      <input
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:border-purple-500 focus:outline-none"
                                        placeholder="Content URL"
                                        value={rev.url || ''}
                                        onChange={e => updateRevisionLesson(idx, rIdx, 'url', e.target.value)}
                                      />
                                    </div>
                                  ))}
                                  {(item.revisionLessons || []).length === 0 && <p className="text-sm text-gray-400 italic">No revision materials added.</p>}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-8 border-t-2 border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {saving ? '💾 Saving...' : '✓ Save Course'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div >
    </div >
  );
};

export default CourseEdit; 