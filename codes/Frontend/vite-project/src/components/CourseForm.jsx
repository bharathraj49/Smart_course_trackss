import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAI } from "../contexts/AIContext";

const MIN_PUBLISH_PRICE_INR = 50;

const CourseForm = () => {
  const { user } = useAuth();
  const { updateContext } = useAI();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    priceInINR: 0,
    thumbnailUrl: "",
    isPublished: false,
    isFree: false,
  });
  const [preTest, setPreTest] = useState({
    passMarkPercent: 70,
    questions: [],
  });
  const [showPreTestForm, setShowPreTestForm] = useState(false);
  const [contents, setContents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Update AI Context
  React.useEffect(() => {
    updateContext({
      title: "Course Creator",
      description: "Creating/Editing a course",
      content: `Editing: ${form.title || "Untitled Course"}\nDescription: ${form.description || "No description"}\nModules: ${contents.length}`,
    });
  }, [form.title, form.description, contents.length, updateContext]);

  const addContent = () => {
    setContents([...contents, { type: "video", title: "", url: "" }]);
  };

  const addSection = () => {
    setContents((prev) => [
      ...prev,
      {
        type: "section",
        title: "Module",
        lessons: [],
        quiz: { passMarkPercent: 70, questions: [] },
        revisionLessons: [],
      },
    ]);
  };

  const updateContent = (idx, field, value) => {
    const next = contents.slice();
    next[idx] = { ...next[idx], [field]: value };
    setContents(next);
  };

  const ensureQuizDefaults = (idx) => {
    setContents((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
            quizQuestions: [],
            passMarkPercent: 70,
            title: it.title || "Quiz",
            type: "quiz",
          }
          : it,
      ),
    );
  };

  const addQuizQuestion = (cIdx) => {
    setContents((prev) =>
      prev.map((it, i) =>
        i === cIdx
          ? {
            ...it,
            quizQuestions: [
              ...(it.quizQuestions || []),
              { question: "", options: ["", ""], correctIndex: 0 },
            ],
          }
          : it,
      ),
    );
  };

  const updateQuizQuestion = (cIdx, qIdx, field, value) => {
    setContents((prev) =>
      prev.map((it, i) => {
        if (i !== cIdx) return it;
        const qs = (it.quizQuestions || []).slice();
        qs[qIdx] = { ...qs[qIdx], [field]: value };
        return { ...it, quizQuestions: qs };
      }),
    );
  };

  const addQuizOption = (cIdx, qIdx) => {
    setContents((prev) =>
      prev.map((it, i) => {
        if (i !== cIdx) return it;
        const qs = (it.quizQuestions || []).slice();
        const opts = (qs[qIdx].options || []).slice();
        opts.push("");
        qs[qIdx] = { ...qs[qIdx], options: opts };
        return { ...it, quizQuestions: qs };
      }),
    );
  };

  const updateQuizOption = (cIdx, qIdx, oIdx, value) => {
    setContents((prev) =>
      prev.map((it, i) => {
        if (i !== cIdx) return it;
        const qs = (it.quizQuestions || []).slice();
        const opts = (qs[qIdx].options || []).slice();
        opts[oIdx] = value;
        qs[qIdx] = { ...qs[qIdx], options: opts };
        return { ...it, quizQuestions: qs };
      }),
    );
  };

  const removeQuizQuestion = (cIdx, qIdx) => {
    setContents((prev) =>
      prev.map((it, i) => {
        if (i !== cIdx) return it;
        const qs = (it.quizQuestions || []).filter((_, k) => k !== qIdx);
        return { ...it, quizQuestions: qs };
      }),
    );
  };

  const removeContent = (idx) => {
    setContents(contents.filter((_, i) => i !== idx));
  };

  // Pre-test functions
  const addPreTestQuestion = () => {
    setPreTest((prev) => ({
      ...prev,
      questions: [
        ...(prev.questions || []),
        { question: "", options: ["", "", "", ""], correctIndex: 0 },
      ],
    }));
  };

  const updatePreTestQuestion = (qIdx, field, value) => {
    setPreTest((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === qIdx ? { ...q, [field]: value } : q,
      ),
    }));
  };

  const updatePreTestOption = (qIdx, oIdx, value) => {
    setPreTest((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          options: q.options.map((opt, j) => (j === oIdx ? value : opt)),
        };
      }),
    }));
  };

  const removePreTestQuestion = (qIdx) => {
    setPreTest((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== qIdx),
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.isPublished && !form.isFree && Number(form.priceInINR) < MIN_PUBLISH_PRICE_INR) {
      setError(
        `Published courses must be priced at least ₹${MIN_PUBLISH_PRICE_INR} unless marked as Free.`,
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        priceInINR: form.isFree ? 0 : form.priceInINR,
        thumbnailUrl: form.thumbnailUrl,
        isPublished: form.isPublished,
        isFree: form.isFree,
        contents: contents || [],
        preTest:
          preTest && preTest.questions && preTest.questions.length > 0
            ? preTest
            : undefined,
      };

      console.log("Submitting course with payload:", payload);

      const res = await axios.post("/courses", payload);

      console.log("Course created successfully:", res.data);
      navigate(`/course/${res.data._id}`);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save course";
      console.error(
        "Error creating course:",
        err.response?.data || err.message,
      );
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== "instructor" && user?.role !== "admin") {
    return <div className="p-6 text-center">You do not have access.</div>;
  }

  const handlePublishToggle = (checked) => {
    setError("");
    if (checked && !form.isFree && Number(form.priceInINR) < MIN_PUBLISH_PRICE_INR) {
      setError(`To publish, set price ≥ ₹${MIN_PUBLISH_PRICE_INR} or make the course Free.`);
      setForm({ ...form, isPublished: false });
      return;
    }
    setForm({ ...form, isPublished: checked });
  };

  const handleFreeToggle = (checked) => {
    setError("");
    setForm({ ...form, isFree: checked, priceInINR: checked ? 0 : form.priceInINR });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white/70 backdrop-blur border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Create Course</h1>
          <span
            className={`px-2 py-1 text-xs rounded-full border ${form.isPublished ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-700 border-gray-200"}`}
          >
            {form.isPublished ? "Published" : "Draft"}
          </span>
        </div>
        <div className="flex items-center justify-end mb-3">
          <button
            type="button"
            onClick={addSection}
            className="px-3 py-1.5 rounded-md border"
          >
            + Module (Section)
          </button>
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Title</label>
              <input
                className="w-full border rounded-xl px-3 py-2"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Price (INR)
              </label>
              <input
                type="number"
                className="w-full border rounded-xl px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Price (INR)"
                value={form.priceInINR}
                disabled={form.isFree}
                onChange={(e) =>
                  setForm({ ...form, priceInINR: Number(e.target.value) })
                }
              />
              {form.isPublished && !form.isFree &&
                Number(form.priceInINR) < MIN_PUBLISH_PRICE_INR && (
                  <div className="mt-1 text-xs text-red-600">
                    Price must be ≥ ₹{MIN_PUBLISH_PRICE_INR} to publish.
                  </div>
                )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Thumbnail URL
            </label>
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="https://..."
              value={form.thumbnailUrl}
              onChange={(e) =>
                setForm({ ...form, thumbnailUrl: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full border rounded-xl px-3 py-2"
              rows={5}
              placeholder="Describe your course"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="flex gap-6">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => handlePublishToggle(e.target.checked)}
              />
              <span>Publish</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(e) => handleFreeToggle(e.target.checked)}
              />
              <span>Make this course Free</span>
            </label>
          </div>

          {/* Pre-Test Section */}
          <div className="border-t pt-4 mt-4">
            <button
              type="button"
              onClick={() => setShowPreTestForm(!showPreTestForm)}
              className="flex items-center gap-2 text-lg font-semibold text-slate-900 hover:text-slate-700"
            >
              {showPreTestForm ? "▼" : "▶"} Pre-Test Configuration
            </button>
            {showPreTestForm && (
              <div className="mt-4 space-y-4 bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Pass Mark Percentage
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full border rounded-xl px-3 py-2"
                    value={preTest.passMarkPercent || 70}
                    onChange={(e) =>
                      setPreTest({
                        ...preTest,
                        passMarkPercent: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">Questions</h3>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
                      onClick={addPreTestQuestion}
                    >
                      + Add Question
                    </button>
                  </div>

                  {preTest.questions && preTest.questions.length > 0 ? (
                    <div className="space-y-3">
                      {preTest.questions.map((question, qIdx) => (
                        <div
                          key={qIdx}
                          className="border rounded-lg p-3 bg-white space-y-2"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <input
                              className="flex-1 border rounded-lg px-3 py-2 text-sm"
                              placeholder={`Question ${qIdx + 1}`}
                              value={question.question}
                              onChange={(e) =>
                                updatePreTestQuestion(
                                  qIdx,
                                  "question",
                                  e.target.value,
                                )
                              }
                            />
                            <button
                              type="button"
                              className="px-2 py-1 text-rose-600 hover:text-rose-700 text-sm"
                              onClick={() => removePreTestQuestion(qIdx)}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="space-y-2 ml-2">
                            {(question.options || []).map((option, oIdx) => (
                              <div
                                key={oIdx}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="radio"
                                  name={`pretest-correct-${qIdx}`}
                                  checked={question.correctIndex === oIdx}
                                  onChange={() =>
                                    updatePreTestQuestion(
                                      qIdx,
                                      "correctIndex",
                                      oIdx,
                                    )
                                  }
                                />
                                <input
                                  className="flex-1 border rounded-lg px-2 py-1 text-sm"
                                  placeholder={`Option ${oIdx + 1}`}
                                  value={option}
                                  onChange={(e) =>
                                    updatePreTestOption(
                                      qIdx,
                                      oIdx,
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">
                      No pre-test questions added yet. Click 'Add Question' to
                      create one.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Modules</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded border"
                  onClick={() =>
                    setContents((prev) => [
                      ...prev,
                      { type: "video", title: "", url: "" },
                    ])
                  }
                >
                  Add Lesson
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded border"
                  onClick={() =>
                    setContents((prev) => [
                      ...prev,
                      {
                        type: "quiz",
                        title: "Quiz",
                        passMarkPercent: 70,
                        quizQuestions: [],
                      },
                    ])
                  }
                >
                  Add Quiz
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded border"
                  onClick={addSection}
                >
                  Add Module (Section)
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-black"
                  onClick={addContent}
                >
                  Add Item
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {contents.map((item, idx) => (
                <div key={idx} className="border rounded-2xl p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="border rounded-xl px-2 py-1"
                      value={item.type}
                      onChange={(e) => {
                        const t = e.target.value;
                        updateContent(idx, "type", t);
                        if (t === "quiz") ensureQuizDefaults(idx);
                      }}
                    >
                      <option value="video">Video</option>
                      <option value="pdf">PDF</option>
                      <option value="note">Note</option>
                      <option value="quiz">Quiz</option>
                      <option value="section">Module (Section)</option>
                    </select>
                    <input
                      className="flex-1 min-w-[180px] border rounded-xl px-2 py-1"
                      placeholder="Title"
                      value={item.title || ""}
                      onChange={(e) =>
                        updateContent(idx, "title", e.target.value)
                      }
                    />
                    {item.type !== "quiz" && item.type !== "section" && (
                      <input
                        className="flex-1 min-w-[200px] border rounded-xl px-2 py-1"
                        placeholder="URL"
                        value={item.url || ""}
                        onChange={(e) =>
                          updateContent(idx, "url", e.target.value)
                        }
                      />
                    )}
                    <button
                      type="button"
                      className="text-rose-600"
                      onClick={() => removeContent(idx)}
                    >
                      Remove
                    </button>
                  </div>

                  {item.type === "quiz" && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Pass mark (%)
                        </label>
                        <input
                          type="number"
                          className="w-full border rounded-xl px-2 py-1"
                          value={item.passMarkPercent || 70}
                          onChange={(e) =>
                            updateContent(
                              idx,
                              "passMarkPercent",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Questions</h3>
                        <button
                          type="button"
                          className="px-2 py-1 rounded border"
                          onClick={() => addQuizQuestion(idx)}
                        >
                          Add Question
                        </button>
                      </div>
                      {(item.quizQuestions || []).map((q, qi) => (
                        <div
                          key={qi}
                          className="rounded-md border p-2 space-y-2"
                        >
                          <input
                            className="w-full border rounded px-2 py-1"
                            placeholder={`Question ${qi + 1}`}
                            value={q.question}
                            onChange={(e) =>
                              updateQuizQuestion(
                                idx,
                                qi,
                                "question",
                                e.target.value,
                              )
                            }
                          />
                          <div className="space-y-1">
                            {(q.options || []).map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${idx}-${qi}`}
                                  checked={q.correctIndex === oi}
                                  onChange={() =>
                                    updateQuizQuestion(
                                      idx,
                                      qi,
                                      "correctIndex",
                                      oi,
                                    )
                                  }
                                />
                                <span className="text-xs text-gray-500">
                                  {q.correctIndex === oi ? "Correct" : "Option"}
                                </span>
                                <input
                                  className="flex-1 border rounded px-2 py-1"
                                  placeholder={`Option ${oi + 1}`}
                                  value={opt}
                                  onChange={(e) =>
                                    updateQuizOption(
                                      idx,
                                      qi,
                                      oi,
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            ))}
                            <button
                              type="button"
                              className="text-xs px-2 py-1 rounded border"
                              onClick={() => addQuizOption(idx, qi)}
                            >
                              Add Option
                            </button>
                          </div>
                          <div className="text-right">
                            <button
                              type="button"
                              className="text-rose-600 text-sm"
                              onClick={() => removeQuizQuestion(idx, qi)}
                            >
                              Remove Question
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.type === "section" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Module Title
                        </label>
                        <input
                          className="w-full border rounded-xl px-2 py-1"
                          value={item.title}
                          onChange={(e) =>
                            updateContent(idx, "title", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">Lessons</h3>
                          <button
                            type="button"
                            className="px-2 py-1 rounded border"
                            onClick={() =>
                              setContents((prev) =>
                                prev.map((it, i) =>
                                  i === idx
                                    ? {
                                      ...it,
                                      lessons: [
                                        ...(it.lessons || []),
                                        { type: "video", title: "", url: "" },
                                      ],
                                    }
                                    : it,
                                ),
                              )
                            }
                          >
                            Add Lesson
                          </button>
                        </div>
                        {(item.lessons || []).map((ls, li) => (
                          <div
                            key={li}
                            className="rounded-md border p-2 space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <select
                                className="border rounded px-2 py-1"
                                value={ls.type}
                                onChange={(e) =>
                                  setContents((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                          ...it,
                                          lessons: it.lessons.map((l, j) =>
                                            j === li
                                              ? { ...l, type: e.target.value }
                                              : l,
                                          ),
                                        }
                                        : it,
                                    ),
                                  )
                                }
                              >
                                <option value="video">Video</option>
                                <option value="pdf">PDF</option>
                                <option value="note">Note</option>
                              </select>
                              <input
                                className="flex-1 border rounded px-2 py-1"
                                placeholder="Lesson title"
                                value={ls.title}
                                onChange={(e) =>
                                  setContents((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                          ...it,
                                          lessons: it.lessons.map((l, j) =>
                                            j === li
                                              ? {
                                                ...l,
                                                title: e.target.value,
                                              }
                                              : l,
                                          ),
                                        }
                                        : it,
                                    ),
                                  )
                                }
                              />
                              <input
                                className="flex-1 border rounded px-2 py-1"
                                placeholder="URL"
                                value={ls.url}
                                onChange={(e) =>
                                  setContents((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                          ...it,
                                          lessons: it.lessons.map((l, j) =>
                                            j === li
                                              ? { ...l, url: e.target.value }
                                              : l,
                                          ),
                                        }
                                        : it,
                                    ),
                                  )
                                }
                              />
                              <button
                                type="button"
                                className="text-rose-600"
                                onClick={() =>
                                  setContents((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                          ...it,
                                          lessons: it.lessons.filter(
                                            (_, j) => j !== li,
                                          ),
                                        }
                                        : it,
                                    ),
                                  )
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">Module Quiz</h3>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Pass mark (%)
                          </label>
                          <input
                            type="number"
                            className="w-full border rounded-xl px-2 py-1"
                            value={item.quiz?.passMarkPercent || 70}
                            onChange={(e) =>
                              setContents((prev) =>
                                prev.map((it, i) =>
                                  i === idx
                                    ? {
                                      ...it,
                                      quiz: {
                                        ...(it.quiz || {}),
                                        passMarkPercent: Number(
                                          e.target.value,
                                        ),
                                      },
                                    }
                                    : it,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">Questions</h4>
                          <button
                            type="button"
                            className="px-2 py-1 rounded border"
                            onClick={() =>
                              setContents((prev) =>
                                prev.map((it, i) =>
                                  i === idx
                                    ? {
                                      ...it,
                                      quiz: {
                                        ...(it.quiz || {
                                          passMarkPercent: 70,
                                          questions: [],
                                        }),
                                        questions: [
                                          ...(it.quiz?.questions || []),
                                          {
                                            question: "",
                                            options: ["", ""],
                                            correctIndex: 0,
                                          },
                                        ],
                                      },
                                    }
                                    : it,
                                ),
                              )
                            }
                          >
                            Add Question
                          </button>
                        </div>
                        {(item.quiz?.questions || []).map((q, qi) => (
                          <div
                            key={qi}
                            className="rounded-md border p-2 space-y-2"
                          >
                            <input
                              className="w-full border rounded px-2 py-1"
                              placeholder={`Question ${qi + 1}`}
                              value={q.question}
                              onChange={(e) =>
                                setContents((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? {
                                        ...it,
                                        quiz: {
                                          ...(it.quiz || {}),
                                          questions: it.quiz.questions.map(
                                            (qq, j) =>
                                              j === qi
                                                ? {
                                                  ...qq,
                                                  question: e.target.value,
                                                }
                                                : qq,
                                          ),
                                        },
                                      }
                                      : it,
                                  ),
                                )
                              }
                            />
                            <div className="space-y-1">
                              {(q.options || []).map((opt, oi) => (
                                <div
                                  key={oi}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="radio"
                                    name={`sec-correct-${idx}-${qi}`}
                                    checked={q.correctIndex === oi}
                                    onChange={() =>
                                      setContents((prev) =>
                                        prev.map((it, i) =>
                                          i === idx
                                            ? {
                                              ...it,
                                              quiz: {
                                                ...(it.quiz || {}),
                                                questions:
                                                  it.quiz.questions.map(
                                                    (qq, j) =>
                                                      j === qi
                                                        ? {
                                                          ...qq,
                                                          correctIndex: oi,
                                                        }
                                                        : qq,
                                                  ),
                                              },
                                            }
                                            : it,
                                        ),
                                      )
                                    }
                                  />
                                  <span className="text-xs text-gray-500">
                                    {q.correctIndex === oi
                                      ? "Correct"
                                      : "Option"}
                                  </span>
                                  <input
                                    className="flex-1 border rounded px-2 py-1"
                                    placeholder={`Option ${oi + 1}`}
                                    value={opt}
                                    onChange={(e) =>
                                      setContents((prev) =>
                                        prev.map((it, i) =>
                                          i === idx
                                            ? {
                                              ...it,
                                              quiz: {
                                                ...(it.quiz || {}),
                                                questions:
                                                  it.quiz.questions.map(
                                                    (qq, j) =>
                                                      j === qi
                                                        ? {
                                                          ...qq,
                                                          options:
                                                            qq.options.map(
                                                              (op, k) =>
                                                                k === oi
                                                                  ? e.target
                                                                    .value
                                                                  : op,
                                                            ),
                                                        }
                                                        : qq,
                                                  ),
                                              },
                                            }
                                            : it,
                                        ),
                                      )
                                    }
                                  />
                                </div>
                              ))}
                              <button
                                type="button"
                                className="text-xs px-2 py-1 rounded border"
                                onClick={() =>
                                  setContents((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                          ...it,
                                          quiz: {
                                            ...(it.quiz || {}),
                                            questions: it.quiz.questions.map(
                                              (qq, j) =>
                                                j === qi
                                                  ? {
                                                    ...qq,
                                                    options: [
                                                      ...qq.options,
                                                      "",
                                                    ],
                                                  }
                                                  : qq,
                                            ),
                                          },
                                        }
                                        : it,
                                    ),
                                  )
                                }
                              >
                                Add Option
                              </button>
                            </div>
                            <div className="text-right">
                              <button
                                type="button"
                                className="text-rose-600 text-sm"
                                onClick={() =>
                                  setContents((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                          ...it,
                                          quiz: {
                                            ...(it.quiz || {}),
                                            questions:
                                              it.quiz.questions.filter(
                                                (_, j) => j !== qi,
                                              ),
                                          },
                                        }
                                        : it,
                                    ),
                                  )
                                }
                              >
                                Remove Question
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">
                            Revision Lessons (shown if quiz failed)
                          </h3>
                          <button
                            type="button"
                            className="px-2 py-1 rounded border"
                            onClick={() =>
                              setContents((prev) =>
                                prev.map((it, i) =>
                                  i === idx
                                    ? {
                                      ...it,
                                      revisionLessons: [
                                        ...(it.revisionLessons || []),
                                        { type: "video", title: "", url: "" },
                                      ],
                                    }
                                    : it,
                                ),
                              )
                            }
                          >
                            Add Revision Lesson
                          </button>
                        </div>
                        {(item.revisionLessons || []).map((rl, ri) => (
                          <div
                            key={ri}
                            className="rounded-md border p-2 space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <select
                                className="border rounded px-2 py-1"
                                value={rl.type}
                                onChange={(e) =>
                                  setContents((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                          ...it,
                                          revisionLessons:
                                            it.revisionLessons.map((l, j) =>
                                              j === ri
                                                ? {
                                                  ...l,
                                                  type: e.target.value,
                                                }
                                                : l,
                                            ),
                                        }
                                        : it,
                                    ),
                                  )
                                }
                              >
                                <option value="video">Video</option>
                                <option value="pdf">PDF</option>
                                <option value="note">Note</option>
                              </select>
                              <input
                                className="flex-1 border rounded px-2 py-1"
                                placeholder="Revision lesson title"
                                value={rl.title}
                                onChange={(e) =>
                                  setContents((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                          ...it,
                                          revisionLessons:
                                            it.revisionLessons.map((l, j) =>
                                              j === ri
                                                ? {
                                                  ...l,
                                                  title: e.target.value,
                                                }
                                                : l,
                                            ),
                                        }
                                        : it,
                                    ),
                                  )
                                }
                              />
                              <input
                                className="flex-1 border rounded px-2 py-1"
                                placeholder="URL"
                                value={rl.url}
                                onChange={(e) =>
                                  setContents((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                          ...it,
                                          revisionLessons:
                                            it.revisionLessons.map((l, j) =>
                                              j === ri
                                                ? {
                                                  ...l,
                                                  url: e.target.value,
                                                }
                                                : l,
                                            ),
                                        }
                                        : it,
                                    ),
                                  )
                                }
                              />
                              <button
                                type="button"
                                className="text-rose-600"
                                onClick={() =>
                                  setContents((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                          ...it,
                                          revisionLessons:
                                            it.revisionLessons.filter(
                                              (_, j) => j !== ri,
                                            ),
                                        }
                                        : it,
                                    ),
                                  )
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-black"
            >
              {saving ? "Saving..." : "Save Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseForm;
