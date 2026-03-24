import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useAI } from "../contexts/AIContext";

const PreTest = ({
  preTest,
  courseId,
  onPassedPreTest,
  onCancelPreTest,
  onSkipPreTest,
}) => {
  const { registerContextProvider } = useAI();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);

  // Handle both preTest.questions and preTest.tests structure
  const { questions, passMarkPercent } = useMemo(() => {
    let q = [];
    let p = 70;

    if (preTest) {
      if (preTest.questions && preTest.questions.length > 0) {
        q = preTest.questions;
        p = preTest.passMarkPercent || 70;
      } else if (preTest.tests && preTest.tests.length > 0) {
        const firstTest = preTest.tests[0];
        q = firstTest.questions || [];
        p = firstTest.passMarkPercent || 70;
      }
    }
    return { questions: q, passMarkPercent: p };
  }, [preTest]);

  // Register context for AI
  useEffect(() => {
    registerContextProvider(() => {
      if (!questions || questions.length === 0) return {};
      const currentQ = questions[currentQuestionIndex];
      return {
        pageType: "quiz",
        quizTitle: "Pre-Test Assessment",
        currentQuestion: currentQ
          ? {
              id: currentQuestionIndex + 1,
              text: currentQ.question,
              options: currentQ.options,
              selectedOptionIndex: selectedAnswers[currentQuestionIndex],
              isAnswered: selectedAnswers[currentQuestionIndex] !== undefined,
            }
          : null,
        progress: {
          current: currentQuestionIndex + 1,
          total: questions.length,
        },
      };
    });

    return () => registerContextProvider(null);
  }, [
    currentQuestionIndex,
    selectedAnswers,
    questions,
    registerContextProvider,
  ]);

  if (!questions || questions.length === 0) {
    console.warn("No questions found in preTest:", preTest);
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  const handleSelectAnswer = (optionIndex) => {
    if (!submitted) {
      setSelectedAnswers({
        ...selectedAnswers,
        [currentQuestionIndex]: optionIndex,
      });
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitTest = async () => {
    // Calculate score
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    const calculatedScore = Math.round((correctCount / totalQuestions) * 100);
    setScore(calculatedScore);
    setSubmitted(true);

    // Try to save pre-test result to backend
    try {
      setLoading(true);
      const response = await axios.post(`/courses/${courseId}/pretest/submit`, {
        score: calculatedScore,
        answers: selectedAnswers,
      });
      console.log("Pre-test submitted successfully:", response.data);
    } catch (err) {
      console.error("Error saving pre-test result:", err);
      // Continue anyway - frontend can still proceed
    } finally {
      setLoading(false);
    }
  };

  const isPassed = score >= passMarkPercent;

  // If currentQuestion is undefined, return loading state
  if (!currentQuestion) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <p className="text-lg text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Show results screen
  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-6">
          {/* Result Header */}
          <div className="text-center space-y-3">
            {isPassed ? (
              <>
                <div className="text-6xl">🎉</div>
                <h2 className="text-3xl font-bold text-green-600">
                  Excellent!
                </h2>
                <p className="text-gray-600">You passed the pre-test</p>
              </>
            ) : (
              <>
                <div className="text-6xl">⚠️</div>
                <h2 className="text-3xl font-bold text-orange-600">Not Yet!</h2>
                <p className="text-gray-600">
                  You need to score higher to proceed
                </p>
              </>
            )}
          </div>

          {/* Score Display */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 text-center space-y-2">
            <div className="text-5xl font-bold text-gray-900">{score}%</div>
            <div className="text-sm text-gray-600">
              {Math.round(
                Object.keys(selectedAnswers).filter(
                  (idx) =>
                    selectedAnswers[idx] === questions[idx]?.correctIndex,
                ).length,
              )}{" "}
              out of {totalQuestions} correct
            </div>
            <div className="text-xs text-gray-500 pt-2">
              Passing Score: {passMarkPercent}%
            </div>
          </div>

          {/* Message */}
          <div className="text-center">
            {isPassed ? (
              <p className="text-gray-700">
                Great job! You've demonstrated knowledge of the fundamentals.
                You can now proceed to enroll and access course materials.
              </p>
            ) : (
              <p className="text-gray-700">
                Your score is below the passing mark. You can retake the test to
                improve your score or skip the pre-test and proceed with the
                course.
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 flex-col">
            {isPassed ? (
              // User passed - show cancel and payment buttons
              <div className="flex gap-3">
                <button
                  onClick={onCancelPreTest}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onPassedPreTest(score)}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Proceed to Payment"}
                </button>
              </div>
            ) : (
              // User failed - show retake and skip buttons
              <>
                <button
                  onClick={() => {
                    setCurrentQuestionIndex(0);
                    setSelectedAnswers({});
                    setSubmitted(false);
                    setScore(0);
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  🔄 Retake Test
                </button>
                <button
                  onClick={() => onSkipPreTest && onSkipPreTest()}
                  className="w-full px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all"
                >
                  ⏭️ Skip Pre-Test
                </button>
                <button
                  onClick={onCancelPreTest}
                  className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          {/* Answer Review Link (optional) */}
          <button
            onClick={() => setSubmitted(false)}
            className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Review Answers
          </button>
        </div>
      </div>
    );
  }

  // Show quiz question
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-6">
        {/* Header */}
        <div className="sticky top-0 bg-white pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Pre-Test</h2>
            <button
              onClick={onCancelPreTest}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span>
                {Math.round(
                  ((currentQuestionIndex + 1) / totalQuestions) * 100,
                )}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {currentQuestionIndex + 1}. {currentQuestion.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelectAnswer(index)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedAnswers[currentQuestionIndex] === index
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedAnswers[currentQuestionIndex] === index
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedAnswers[currentQuestionIndex] === index && (
                      <span className="text-white text-sm font-bold">✓</span>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-2 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          {currentQuestionIndex === totalQuestions - 1 ? (
            <>
              <button
                onClick={handleSubmitTest}
                disabled={Object.keys(selectedAnswers).length < totalQuestions}
                className="flex-1 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ Submit Test
              </button>
              <button
                onClick={() => onSkipPreTest && onSkipPreTest()}
                className="flex-1 px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all"
              >
                ⏭️ Skip Pre-Test
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleNext}
                disabled={selectedAnswers[currentQuestionIndex] === undefined}
                className="flex-1 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
              <button
                onClick={() => onSkipPreTest && onSkipPreTest()}
                className="flex-1 px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all"
              >
                ⏭️ Skip
              </button>
            </>
          )}
        </div>

        {/* Unanswered Warning */}
        {Object.keys(selectedAnswers).length < currentQuestionIndex + 1 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
            ⚠️ Please answer this question before proceeding
          </div>
        )}
      </div>
    </div>
  );
};

export default PreTest;
