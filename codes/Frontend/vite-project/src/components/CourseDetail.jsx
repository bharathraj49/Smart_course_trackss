import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import ReactPlayer from "react-player";
import { useAuth } from "../contexts/AuthContext";
import { useAI } from "../contexts/AIContext";
import PreTest from "./PreTest";

import AdvancedIDE from "./AdvancedIDE/AdvancedIDE";
import CertificateModal from "./CertificateModal";

const toDriveDownloadUrl = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("drive.google.com")) {
      const match = u.pathname.match(/\/file\/d\/([^/]+)/);
      const id = match?.[1] || u.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
  } catch {
    // ignore
  }
  return url;
};

const getYouTubeEmbed = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    // ignore
  }
  return null;
};

const getVimeoEmbed = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    // ignore
  }
  return null;
};

// Extract YouTube video ID from various URL formats
const getYouTubeId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/,
    /youtube\.com\/v\/([^&?/\s]+)/,
    /youtube\.com\/shorts\/([^&?/\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

// YouTube player that detects actual video completion via IFrame API postMessage
const YouTubePlayer = ({ url, isCompleted, onComplete }) => {
  const iframeRef = useRef(null);
  const videoId = getYouTubeId(url);
  const embedSrc = videoId
    ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    : url;

  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // YouTube sends info events; playerState 0 = ended
        if (data.event === "infoDelivery" && data.info?.playerState === 0) {
          if (onComplete && !isCompleted) onComplete();
        }
      } catch {
        // ignore non-JSON messages
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onComplete, isCompleted]);

  if (!videoId) {
    return (
      <div className="p-6 bg-black/80 rounded-xl text-center text-white">
        <div className="mb-3">This YouTube link could not be embedded.</div>
        <a href={url} target="_blank" rel="noreferrer" className="underline text-blue-200">
          Open in YouTube
        </a>
      </div>
    );
  }

  return (
    <div className="w-full bg-black rounded-xl overflow-hidden flex flex-col">
      <div className="w-full aspect-video">
        <iframe
          ref={iframeRef}
          src={embedSrc}
          className="w-full h-full"
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {!isCompleted && onComplete && (
        <div className="p-3 bg-gray-900 border-t border-gray-800 flex justify-end items-center">
          <span className="text-gray-400 text-xs mr-4 italic">Video not loading or already watched?</span>
          <button
            onClick={onComplete}
            className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>▶️</span> Skip & Mark Complete
          </button>
        </div>
      )}
    </div>
  );
};

const Player = ({ item, isCompleted, onComplete }) => {
  const [videoError, setVideoError] = useState("");

  if (!item)
    return (
      <div className="text-sm text-gray-500">Select a lesson to begin.</div>
    );

  if (item.type === "video") {
    const url = item.url || "";
    const isYouTube = /youtube\.com|youtu\.be/i.test(url);
    const isVimeo = /vimeo\.com/i.test(url);

    if (isYouTube) {
      return (
        <YouTubePlayer
          url={url}
          isCompleted={isCompleted}
          onComplete={onComplete}
        />
      );
    }

    if (isVimeo) {
      // For Vimeo use direct iframe embed
      const vimeoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      const vimeoSrc = vimeoId
        ? `https://player.vimeo.com/video/${vimeoId}?api=1`
        : url;
      return (
        <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={vimeoSrc}
            className="w-full h-full"
            title={item.title}
            allow="autoplay; fullscreen"
            allowFullScreen
          />
          {!isCompleted && onComplete && (
            <div className="p-3 bg-gray-900 flex justify-center border-t border-gray-800">
              <button
                onClick={onComplete}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Mark as Watched
              </button>
            </div>
          )}
        </div>
      );
    }


    // For direct file URLs (mp4, webm, Google Drive), use native <video>
    const src = toDriveDownloadUrl(url);
    const isMp4 = /\.mp4($|\?)/i.test(src);
    const isWebm = /\.webm($|\?)/i.test(src);
    return (
      <div>
        <video
          key={src}
          className="w-full aspect-video rounded-xl bg-black"
          controls
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          onEnded={() => {
            if (onComplete && !isCompleted) onComplete();
          }}
          onError={() =>
            setVideoError(
              "Unable to play this video. If it's from Google Drive, make sure the file is shared publicly.",
            )
          }
        >
          <source
            src={src}
            type={isMp4 ? "video/mp4" : isWebm ? "video/webm" : undefined}
          />
          Your browser does not support the video tag.
        </video>
        {videoError && (
          <div className="mt-2 text-sm text-red-600">
            {videoError}{" "}
            <a href={src} target="_blank" rel="noreferrer" className="underline">
              Open in new tab
            </a>
          </div>
        )}
      </div>
    );
  }

  if (item.type === "pdf") {
    return (
      <div className="h-[70vh] bg-gray-50 rounded-xl overflow-hidden border">
        <iframe title={item.title} src={item.url} className="w-full h-full" />
      </div>
    );
  }
  if (item.type === "code" || item.codingProblem) {
    return <CodingProblemSolver item={item} />;
  }
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="text-sm text-gray-500 uppercase">Note</div>
      <div className="whitespace-pre-wrap text-gray-800 mt-2 break-words">
        {item.url || "No note URL provided."}
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="inline-block mt-3 text-indigo-600 text-sm"
      >
        Open note →
      </a>
    </div>
  );
};

// ─── Protected Quiz Wrapper ─────────────────────────────────────────────────
const MAX_VIOLATIONS = 3;
const enterFullscreen = () => {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => { });
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
};
const exitFullscreen = () => {
  if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
  else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
};

const ProtectedQuizWrapper = ({ children, onForceSubmit, hasResult }) => {
  const [started, setStarted] = useState(false);       // has user clicked "Start"
  const [violations, setViolations] = useState(0);
  const [blocked, setBlocked] = useState(false);        // blocking overlay active
  const [blockMsg, setBlockMsg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [terminated, setTerminated] = useState(false);

  // --- Fullscreen change tracking ---
  useEffect(() => {
    const onChange = () => {
      const inFs = !!document.fullscreenElement || !!document.webkitFullscreenElement;
      setIsFullscreen(inFs);
      if (!inFs && started && !hasResult && !terminated) {
        triggerViolation("You exited fullscreen during the exam!");
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [started, hasResult, terminated]);

  // --- Tab switch / window blur detection ---
  useEffect(() => {
    if (!started || hasResult || terminated) return;
    const onHide = () => {
      if (document.hidden) triggerViolation("You switched away from the exam tab!");
    };
    const onBlur = () => triggerViolation("You clicked outside the exam window!");
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
    };
  }, [started, hasResult, terminated, violations]);

  // --- Disable right-click & copy shortcuts ---
  useEffect(() => {
    if (!started || hasResult) return;
    const prevent = (e) => e.preventDefault();
    const blockKeys = (e) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "a", "u", "s"].includes(e.key.toLowerCase()))
        e.preventDefault();
      if (e.key === "F12") e.preventDefault();
    };
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("keydown", blockKeys);
    };
  }, [started, hasResult]);

  // --- Cleanup fullscreen when result arrives or component unmounts ---
  useEffect(() => {
    if (hasResult) exitFullscreen();
  }, [hasResult]);
  useEffect(() => () => exitFullscreen(), []);

  const triggerViolation = (msg) => {
    setViolations((prev) => {
      const next = prev + 1;
      setBlockMsg(msg);
      setBlocked(true);
      if (next >= MAX_VIOLATIONS) {
        setTerminated(true);
        if (onForceSubmit) onForceSubmit();
      }
      return next;
    });
  };

  const handleStart = () => {
    enterFullscreen();
    setIsFullscreen(true);
    setStarted(true);
  };

  const handleContinue = () => {
    enterFullscreen();
    setBlocked(false);
  };

  // ── Entry screen ──────────────────────────────────────────────────────
  if (!started && !hasResult) {
    return (
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="bg-gray-900 text-white px-6 py-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">🛡️</div>
          <h2 className="text-xl font-bold">Protected Exam Mode</h2>
          <p className="text-gray-300 text-sm max-w-md">
            This assessment is conducted in protected mode. The page will go fullscreen
            and any attempt to switch tabs, open other windows, or exit fullscreen will
            be recorded as a violation. <strong>{MAX_VIOLATIONS} violations</strong> will automatically submit your exam.
          </p>
          <ul className="text-left text-sm text-gray-400 space-y-1 w-full max-w-xs">
            {["Fullscreen mode enforced", "Tab switching detected", "Window focus loss detected", "Right-click & copy disabled", `Auto-submit after ${MAX_VIOLATIONS} violations`].map((r) => (
              <li key={r} className="flex items-center gap-2">
                <span className="text-red-400">✕</span> {r}
              </li>
            ))}
          </ul>
          <button
            onClick={handleStart}
            className="mt-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-base transition-colors shadow-lg"
          >
            Enter Protected Mode & Start Quiz →
          </button>
        </div>
      </div>
    );
  }

  // ── Blocking overlay (violation detected) ─────────────────────────────
  if (blocked) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center text-white p-8">
        <div className="max-w-md w-full bg-red-950/80 border border-red-700 rounded-2xl p-8 text-center shadow-2xl">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-300 mb-2">Exam Paused — Violation Detected</h2>
          <p className="text-red-200 mb-2">{blockMsg}</p>
          <div className="my-4 inline-flex items-center gap-2 bg-red-900 rounded-full px-4 py-2">
            <span className="text-red-300 text-sm font-semibold">
              Violation {violations} of {MAX_VIOLATIONS}
            </span>
          </div>
          <p className="text-sm text-red-300 mb-6">
            {MAX_VIOLATIONS - violations > 0
              ? `${MAX_VIOLATIONS - violations} more violation(s) will auto-submit your exam.`
              : "Your exam has been submitted due to repeated violations."}
          </p>
          {!terminated && (
            <button
              onClick={handleContinue}
              className="w-full py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-colors"
            >
              I understand — Return to Exam (Re-enter Fullscreen)
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Active exam ───────────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* Status bar */}
      {!hasResult && (
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 bg-gray-900 text-white rounded-full px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            🛡️ Protected Mode — Fullscreen Active
          </span>
          {violations > 0 && (
            <span className="text-red-600 font-bold">
              ⚠️ {violations}/{MAX_VIOLATIONS} violations
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
};
// ────────────────────────────────────────────────────────────────────────────




const Quiz = ({ item, onSubmit, lastResult, onRetry, progress, courseId, moduleIndex }) => {
  // Quiz start state (fetched from /start endpoint)
  const [startInfo, setStartInfo] = useState(null); // { questions, setIndex, attempts, maxAttempts, attemptsLeft, alreadyPassed }
  const [startLoading, setStartLoading] = useState(true);
  const [startError, setStartError] = useState("");

  // Answer & submission state
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const { getAssessmentHelp } = useAI();
  const [helpData, setHelpData] = useState({});

  const hasResult = lastResult !== null;

  // Fetch question set + attempt info from the server
  const fetchStart = async () => {
    setStartLoading(true);
    setStartError("");
    setShowAnswers(false);
    setHelpData({});
    try {
      const r = await axios.get(`/courses/${courseId}/quiz/${moduleIndex}/start`);
      setStartInfo(r.data);
      setAnswers(Array((r.data.questions || []).length).fill(null));
    } catch (e) {
      setStartError(e.response?.data?.message || "Failed to load quiz. Please try again.");
    } finally {
      setStartLoading(false);
    }
  };

  useEffect(() => { fetchStart(); }, [moduleIndex]);

  const handleRetry = () => {
    onRetry();
    fetchStart();
  };

  // Questions for this attempt come directly from the server
  const questions = startInfo?.questions || [];
  const setIndex = startInfo?.setIndex ?? 0;
  const attemptsLeft = startInfo?.attemptsLeft ?? null;
  const maxAttempts = startInfo?.maxAttempts ?? 3;
  const attemptsDone = startInfo?.attempts ?? 0;

  const canSubmit = answers.length === questions.length && answers.length > 0 && !answers.includes(null);
  const isLocked = !hasResult && attemptsLeft === 0;

  const handleSubmit = async () => {
    if (hasResult) { handleRetry(); return; }
    if (!canSubmit || isLocked) return;
    setSubmitting(true);
    try {
      await onSubmit({ answers, setIndex });
      setShowAnswers(true);
    } catch (error) {
      alert(error.message || "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGetHelp = async (qi) => {
    const qData = questions[qi];
    if (!qData) return;
    const userAnswerIdx = answers[qi];
    const userAnswer = qData.options[userAnswerIdx];
    const correctAnswer = qData.options[qData.correctIndex];
    setHelpData(prev => ({ ...prev, [qi]: { loading: true } }));
    try {
      const data = await getAssessmentHelp(qData.question, userAnswer, correctAnswer, { quizTitle: item.title, revisionLessons: [] });
      setHelpData(prev => ({ ...prev, [qi]: { loading: false, data } }));
    } catch {
      setHelpData(prev => ({ ...prev, [qi]: { loading: false, error: "Could not retrieve AI help." } }));
    }
  };

  const isCorrectAnswer = (qi, optionIndex) => {
    if (!showAnswers || !hasResult) return false;
    return questions[qi]?.correctIndex === optionIndex;
  };

  const getAnswerClass = (qi, optionIndex) => {
    if (!showAnswers) return "";
    if (isCorrectAnswer(qi, optionIndex)) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (answers[qi] === optionIndex && !lastResult?.passed) return "text-red-700 bg-red-50 border-red-200";
    return "";
  };

  // Loading state
  if (startLoading) {
    return (
      <div className="bg-white border rounded-xl p-8 flex items-center justify-center gap-3 text-gray-500">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        Loading assessment...
      </div>
    );
  }

  if (startError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 mb-3">{startError}</p>
        <button onClick={fetchStart} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Try Again</button>
      </div>
    );
  }

  // Locked state — no attempts left and not passed
  if (isLocked) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl">🔒</div>
        <h3 className="font-bold text-red-900 text-lg">No Attempts Remaining</h3>
        <p className="text-red-700 text-sm max-w-sm">
          You have used all {maxAttempts} attempt{maxAttempts !== 1 ? "s" : ""} for this assessment.
          Please review the revision materials below and contact your instructor if you need assistance.
        </p>
        <div className="mt-2 px-4 py-2 bg-red-100 rounded-full text-xs font-bold text-red-800">
          {attemptsDone}/{maxAttempts} Attempts Used
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-lg font-medium">Quiz: {item.title}</h3>
        <div className="flex items-center gap-2">
          {/* Attempt counter badge */}
          {attemptsLeft !== null && !hasResult && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${attemptsLeft <= 1 ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"}`}>
              Attempt {attemptsDone + 1} of {maxAttempts}
            </span>
          )}
          {hasResult && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${lastResult.passed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {lastResult.passed ? "✓ Passed" : "✗ Not Passed"}
            </span>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, qi) => {
          const isWrong = hasResult && answers[qi] !== q.correctIndex;
          const helpState = helpData[qi];
          return (
            <div key={qi} className="border rounded-lg p-4 transition-all">
              <div className="font-medium mb-3">{q.question}</div>
              <div className="space-y-2 mb-3">
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    className={`flex items-start gap-3 p-3 rounded-md border ${getAnswerClass(qi, oi) || "hover:bg-gray-50 border-gray-200"} ${!hasResult ? "cursor-pointer" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`q${qi}`}
                      checked={answers[qi] === oi}
                      onChange={() => !hasResult && setAnswers(prev => prev.map((v, i) => i === qi ? oi : v))}
                      className="mt-1"
                      disabled={hasResult}
                    />
                    <div className="flex-1">
                      <div className="text-sm">{opt}</div>
                      {showAnswers && isCorrectAnswer(qi, oi) && (
                        <div className="text-xs mt-1 text-emerald-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Correct Answer
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* AI Help — only if wrong */}
              {isWrong && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-4">
                    {!helpState?.data && !helpState?.loading && (
                      <button onClick={() => handleGetHelp(qi)} className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors">
                        <span>🤖</span> Get AI Help
                      </button>
                    )}
                  </div>
                  {helpState?.loading && (
                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Analyzing your answer...
                    </div>
                  )}
                  {helpState?.error && <div className="text-sm text-red-600 mt-2">{helpState.error}</div>}
                  {helpState?.data && (
                    <div className="mt-3 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4">
                      <h4 className="font-bold text-indigo-900 text-sm mb-2 flex items-center gap-2"><span>💡</span> AI Explanation</h4>
                      <p className="text-sm text-gray-800 mb-3 leading-relaxed">{helpState.data.explanation}</p>
                      {helpState.data.correctConcept && (
                        <div className="mb-3">
                          <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Key Concept:</span>
                          <p className="text-sm text-gray-700 mt-1">{helpState.data.correctConcept}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Result summary */}
      {hasResult && (
        <div className={`p-4 rounded-lg ${lastResult.passed ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="font-medium">{lastResult.passed ? "Quiz Passed!" : "Quiz Not Yet Passed"}</h4>
              <p className="text-sm text-gray-600">
                Your score: {lastResult.scorePercent}%
                {lastResult.attemptsLeft !== undefined && !lastResult.passed && (
                  <span className={`ml-2 font-semibold ${lastResult.attemptsLeft === 0 ? "text-red-600" : "text-amber-700"}`}>
                    • {lastResult.attemptsLeft} attempt{lastResult.attemptsLeft !== 1 ? "s" : ""} remaining
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action button */}
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleSubmit}
          disabled={(!canSubmit && !hasResult) || submitting}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${hasResult
            ? lastResult.attemptsLeft === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
            : canSubmit
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
        >
          {submitting ? "Submitting..." : hasResult ? (lastResult.attemptsLeft === 0 ? "No Attempts Left" : "Try Again") : "Submit Quiz"}
        </button>
        {!hasResult && !canSubmit && (
          <p className="text-sm text-red-500">Please answer all questions before submitting.</p>
        )}
      </div>
    </div>
  );
};

const CodingProblemSolver = ({ item }) => {
  const { registerContextProvider } = useAI();
  const [code, setCode] = useState(item.codingProblem?.starterCode || "");
  const [language, setLanguage] = useState(
    item.codingProblem?.language || "javascript",
  );
  const [testResults, setTestResults] = useState(null);
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [customResult, setCustomResult] = useState(null);
  const points = item.codingProblem?.points || 10;

  // Custom test case management state
  const [customTestCases, setCustomTestCases] = useState([]);
  const [activeTab, setActiveTab] = useState("quick"); // "quick" or "custom"
  const [showCustomTestForm, setShowCustomTestForm] = useState(false);
  const [editingTestIndex, setEditingTestIndex] = useState(null);
  const [customTestResults, setCustomTestResults] = useState(null);
  const [testCaseForm, setTestCaseForm] = useState({
    name: "",
    input: "",
    expectedOutput: "",
  });

  useEffect(() => {
    setCode(item.codingProblem?.starterCode || "");
    setLanguage(item.codingProblem?.language || "javascript");
    setTestResults(null);
    setCustomResult(null);
    setCustomInput("");
    setCustomTestResults(null);

    // Load custom test cases from localStorage
    const storageKey = `customTests:${item.codingProblem?.id || item.title}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCustomTestCases(JSON.parse(saved));
      } else {
        setCustomTestCases([]);
      }
    } catch (e) {
      console.error("Error loading custom test cases:", e);
      setCustomTestCases([]);
    }
  }, [item]);

  // Sync code to ref for AI context (efficiently)
  const codeRef = useRef(code);
  const customInputRef = useRef(customInput);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);
  useEffect(() => {
    customInputRef.current = customInput;
  }, [customInput]);

  // Register context provider for AI
  useEffect(() => {
    registerContextProvider(() => ({
      activeTask: "Graded Coding Problem",
      problemTitle: item.title,
      problemDescription: item.codingProblem?.description,
      userCode: codeRef.current,
      userCustomInput: customInputRef.current,
      language: item.codingProblem?.language || "javascript",
    }));

    // Cleanup on unmount
    return () => registerContextProvider(null);
  }, [registerContextProvider, item]);

  // Save custom test cases to localStorage whenever they change
  useEffect(() => {
    if (item.codingProblem) {
      const storageKey = `customTests:${item.codingProblem?.id || item.title}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(customTestCases));
      } catch (e) {
        console.error("Error saving custom test cases:", e);
      }
    }
  }, [customTestCases, item]);

  // Custom test case CRUD functions
  const addOrUpdateTestCase = () => {
    if (!testCaseForm.name.trim() || !testCaseForm.expectedOutput.trim()) {
      alert("Please provide at least a name and expected output for the test case.");
      return;
    }

    if (editingTestIndex !== null) {
      // Update existing test case
      const updated = [...customTestCases];
      updated[editingTestIndex] = { ...testCaseForm };
      setCustomTestCases(updated);
      setEditingTestIndex(null);
    } else {
      // Add new test case
      setCustomTestCases([...customTestCases, { ...testCaseForm }]);
    }

    // Reset form
    setTestCaseForm({ name: "", input: "", expectedOutput: "" });
    setShowCustomTestForm(false);
  };

  const editTestCase = (index) => {
    setTestCaseForm({ ...customTestCases[index] });
    setEditingTestIndex(index);
    setShowCustomTestForm(true);
  };

  const deleteTestCase = (index) => {
    if (confirm("Are you sure you want to delete this test case?")) {
      const updated = customTestCases.filter((_, i) => i !== index);
      setCustomTestCases(updated);
      setCustomTestResults(null);
    }
  };

  const clearAllTestCases = () => {
    if (confirm("Are you sure you want to delete all custom test cases?")) {
      setCustomTestCases([]);
      setCustomTestResults(null);
    }
  };

  const cancelTestCaseForm = () => {
    setTestCaseForm({ name: "", input: "", expectedOutput: "" });
    setEditingTestIndex(null);
    setShowCustomTestForm(false);
  };

  const runSingleCustomTest = async (testCase, index) => {
    let actualOutput = "";
    let error = null;

    try {
      if (language === "javascript" || language === "node") {
        let codeToRun = code;
        if (testCase.input) {
          let inputVal;
          try {
            inputVal = JSON.parse(testCase.input);
          } catch {
            inputVal = testCase.input;
          }
          codeToRun = `const input = ${JSON.stringify(inputVal)};\n` + code;
        }

        let logs = [];
        const oldLog = console.log;
        console.log = (...args) => {
          logs.push(
            args
              .map((a) =>
                typeof a === "object" ? JSON.stringify(a) : String(a),
              )
              .join(" "),
          );
        };

        const f = new Function(
          "React",
          "exports",
          "module",
          "require",
          `return (async () => {
             ${codeToRun}
           })();`,
        );

        const exports = {};
        const module = { exports };
        await f(null, exports, module, () => ({}));

        console.log = oldLog;
        actualOutput = logs.join("\n").trim();
      } else {
        actualOutput = "Custom testing only supported for JavaScript/Node.js currently.";
      }
    } catch (e) {
      error = e.message;
    }

    const passed = !error && actualOutput === testCase.expectedOutput.trim();

    // Update results for this specific test
    setCustomTestResults((prev) => {
      const newResults = prev ? [...prev] : new Array(customTestCases.length).fill(null);
      newResults[index] = {
        input: testCase.input,
        expected: testCase.expectedOutput,
        actual: actualOutput,
        error: error,
        passed: passed,
      };
      return newResults;
    });
  };

  const runAllCustomTests = async () => {
    if (customTestCases.length === 0) {
      alert("No custom test cases to run.");
      return;
    }

    const results = [];
    for (const tc of customTestCases) {
      let actualOutput = "";
      let error = null;

      try {
        if (language === "javascript" || language === "node") {
          let codeToRun = code;
          if (tc.input) {
            let inputVal;
            try {
              inputVal = JSON.parse(tc.input);
            } catch {
              inputVal = tc.input;
            }
            codeToRun = `const input = ${JSON.stringify(inputVal)};\n` + code;
          }

          let logs = [];
          const oldLog = console.log;
          console.log = (...args) => {
            logs.push(
              args
                .map((a) =>
                  typeof a === "object" ? JSON.stringify(a) : String(a),
                )
                .join(" "),
            );
          };

          const f = new Function(
            "React",
            "exports",
            "module",
            "require",
            `return (async () => {
               ${codeToRun}
             })();`,
          );

          const exports = {};
          const module = { exports };
          await f(null, exports, module, () => ({}));

          console.log = oldLog;
          actualOutput = logs.join("\n").trim();
        } else {
          actualOutput = "Custom testing only supported for JavaScript/Node.js currently.";
        }
      } catch (e) {
        error = e.message;
      }

      const passed = !error && actualOutput === tc.expectedOutput.trim();
      results.push({
        input: tc.input,
        expected: tc.expectedOutput,
        actual: actualOutput,
        error: error,
        passed: passed,
      });
    }

    setCustomTestResults(results);
  };


  const runCustomTest = async () => {
    let actualOutput = "";
    let error = null;

    try {
      if (language === "javascript" || language === "node") {
        let codeToRun = code;
        if (customInput) {
          let inputVal;
          try {
            inputVal = JSON.parse(customInput);
          } catch {
            inputVal = customInput;
          }
          codeToRun = `const input = ${JSON.stringify(inputVal)};\n` + code;
        }

        let logs = [];
        const oldLog = console.log;
        console.log = (...args) => {
          logs.push(
            args
              .map((a) =>
                typeof a === "object" ? JSON.stringify(a) : String(a),
              )
              .join(" "),
          );
        };

        const f = new Function(
          "React",
          "exports",
          "module",
          "require",
          `return (async () => {
             ${codeToRun}
           })();`,
        );

        // Mock exports/module for compatibility
        const exports = {};
        const module = { exports };

        await f(null, exports, module, () => ({}));

        console.log = oldLog;
        actualOutput = logs.join("\n").trim();
      } else {
        actualOutput =
          "Custom testing only supported for JavaScript/Node.js currently.";
      }
    } catch (e) {
      error = e.message;
    }

    setCustomResult({
      input: customInput,
      output: actualOutput,
      error: error,
    });
  };

  const runTests = async () => {
    if (!item.codingProblem?.testCases?.length) {
      alert("No test cases defined for this problem.");
      return;
    }

    const results = [];
    const testCases = item.codingProblem.testCases;

    for (const tc of testCases) {
      try {
        let actualOutput = "";
        let passed = false;

        if (language === "javascript" || language === "node") {
          let codeToRun = code;
          if (tc.input) {
            let inputVal;
            try {
              inputVal = JSON.parse(tc.input);
            } catch {
              inputVal = tc.input;
            }
            codeToRun = `const input = ${JSON.stringify(inputVal)};\n` + code;
          }

          let logs = [];
          const oldLog = console.log;
          console.log = (...args) => {
            logs.push(
              args
                .map((a) =>
                  typeof a === "object" ? JSON.stringify(a) : String(a),
                )
                .join(" "),
            );
          };

          const f = new Function(
            "React",
            "exports",
            "module",
            "require",
            `return (async () => {
               ${codeToRun}
             })();`,
          );

          const exports = {};
          const module = { exports };

          await f(null, exports, module, () => ({}));

          console.log = oldLog;
          actualOutput = logs.join("\n").trim();
          passed = actualOutput === tc.expectedOutput.trim();
        } else if (language === "jsx" || language === "react") {
          if (code.includes(tc.expectedOutput)) {
            actualOutput = tc.expectedOutput;
            passed = true;
          } else {
            actualOutput =
              "(React Render Simulation) Could not find expected output in code.";
            passed = false;
          }
        } else {
          actualOutput = "Language not supported for auto-testing yet.";
          passed = false;
        }

        results.push({
          input: tc.input,
          expected: tc.expectedOutput,
          actual: actualOutput,
          passed: passed,
        });
      } catch (e) {
        results.push({
          input: tc.input,
          expected: tc.expectedOutput,
          actual: `Error: ${e.message}`,
          passed: false,
        });
      }
    }
    const allPassed = results.every((r) => r.passed);
    setTestResults(results);
    if (allPassed && results.length > 0) {
      setPointsAwarded(true);
    } else {
      setPointsAwarded(false);
    }
  };

  return (
    <div className="space-y-6 border-4 border-indigo-100 rounded-3xl p-6 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
            <span>🏆</span> Graded Coding Task
          </h2>
          <p className="text-gray-500 text-sm">
            Solve this problem to earn points!
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 uppercase font-bold">
            Possible Points
          </div>
          <div className="text-3xl font-black text-indigo-600">{points}</div>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-900">
          <span className="text-2xl">🧩</span>
          Problem Description
        </h3>
        <div className="prose prose-indigo max-w-none text-gray-800 whitespace-pre-wrap font-medium">
          {item.codingProblem?.description || "No description provided."}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <span className="text-2xl">💻</span>
            Your Solution
          </h3>
          <div className="flex gap-2">

            <button
              onClick={runTests}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <span>▶️</span> Submit & Check
            </button>
          </div>
        </div>

        <div className="h-[500px]">
          <AdvancedIDE
            initialCode={code}
            onCodeChange={setCode}
            initialLanguage={language}
            readOnly={false}
          />
        </div>



        {/* Test Results */}
        {testResults && (
          <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-gray-900">Test Results</h4>
              {pointsAwarded && (
                <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full font-bold border border-yellow-300 animate-bounce">
                  🎉 +{points} Points Awarded!
                </div>
              )}
            </div>
            <div className="space-y-3">
              {testResults.map((res, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border-l-4 ${res.passed ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm text-gray-700">
                      Test Case {idx + 1}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${res.passed ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}
                    >
                      {res.passed ? "PASSED" : "FAILED"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">
                        Input
                      </span>
                      <code className="block bg-white p-2 rounded border border-gray-200 mt-1">
                        {res.input || "(none)"}
                      </code>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">
                        Expected Output
                      </span>
                      <code className="block bg-white p-2 rounded border border-gray-200 mt-1">
                        {res.expected}
                      </code>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-xs font-semibold text-gray-500 uppercase">
                        Actual Output
                      </span>
                      <code
                        className={`block p-2 rounded border mt-1 ${res.passed ? "bg-white border-gray-200" : "bg-red-100 border-red-200 text-red-900"}`}
                      >
                        {res.actual}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ModuleScratchpad = ({
  isOpen,
  setIsOpen,
  code,
  setCode,
  language,
  setLanguage,
}) => (
  <div className="space-y-4 mt-8 pt-8 border-t border-gray-200">
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={`w-full flex items-center justify-between px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 border-2 ${isOpen
        ? "bg-gray-800 border-gray-700 text-white shadow-2xl"
        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
    >
      <span className="flex items-center gap-3">
        <span className="text-2xl">🛠️</span>
        <span>
          Playground / Scratchpad{" "}
          <span className="text-sm font-normal opacity-75">(Not Graded)</span>
        </span>
      </span>
      <span className="text-2xl">{isOpen ? "−" : "+"}</span>
    </button>
    {isOpen && (
      <div className="animate-in space-y-4">
        {/* Language Selector */}
        <div className="flex flex-wrap gap-2 p-4 bg-white rounded-2xl border-2 border-gray-200">
          <span className="text-sm font-bold text-gray-700 w-full mb-2">
            Select Language:
          </span>
          {[
            { id: "javascript", name: "JavaScript", icon: "⚡" },
            { id: "jsx", name: "React JSX", icon: "⚛️" },
            { id: "node", name: "Node.js", icon: "🟢" },
            { id: "express", name: "Express", icon: "🚀" },
            { id: "tailwind", name: "Tailwind CSS", icon: "🎨" },
            { id: "html", name: "HTML", icon: "🌐" },
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id)}
              className={`px-3 py-2 rounded-xl font-medium text-sm transition-all border-2 ${language === lang.id
                ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-lg"
                : "bg-gray-100 text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                }`}
            >
              <span className="mr-1">{lang.icon}</span>
              {lang.name}
            </button>
          ))}
        </div>
        <div className="h-[500px]">
          <AdvancedIDE
            initialCode={code}
            onCodeChange={setCode}
            initialLanguage={language}
            readOnly={false}
          />
        </div>
      </div>
    )}
  </div>
);

const CourseDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [justEnrolled, setJustEnrolled] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { updateContext, registerContextProvider } = useAI();
  const [completed, setCompleted] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]); // Array of "moduleIdx-lessonIdx" strings
  const [activeIdx, setActiveIdx] = useState(0);
  const [quizResult, setQuizResult] = useState(null);
  const [sectionLessonIdx, setSectionLessonIdx] = useState(0);

  // Reset lesson index when switching modules so stale index doesn't carry over
  useEffect(() => { setSectionLessonIdx(0); }, [activeIdx]);
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [editorCode, setEditorCode] = useState(
    '// Write your JavaScript code here\nconsole.log("Hello, World!");',
  );
  const [editorLanguage, setEditorLanguage] = useState("javascript");
  const [preTestCompleted, setPreTestCompleted] = useState(false);
  const [showPreTest, setShowPreTest] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("content"); // content, code
  const [certificate, setCertificate] = useState(null);
  const [moduleCertificates, setModuleCertificates] = useState({});
  const [selectedCert, setSelectedCert] = useState(null);
  const [selectedModuleCertTitle, setSelectedModuleCertTitle] = useState("");
  const [progress, setProgress] = useState(null);
  const fallbackThumbnail =
    "https://placehold.co/800x450?text=Course+Thumbnail";

  // Sync editor code for AI context
  const editorCodeRef = useRef(editorCode);
  useEffect(() => {
    editorCodeRef.current = editorCode;
  }, [editorCode]);

  useEffect(() => {
    if (codeEditorOpen) {
      registerContextProvider(() => ({
        activeTask: "Course Scratchpad",
        userCode: editorCodeRef.current,
        language: editorLanguage,
      }));
    } else {
      // Unregister if scratchpad closed, but optional since other components might overwrite.
      // However, if we unregister/set null, it might clear CodingProblemSolver's context if it was active.
      // Prudent to only unregister if we were the ones who registered it.
      // For simplicity, we only register. The next 'mount' or 'open' event will overwrite.
    }
  }, [codeEditorOpen, registerContextProvider, editorLanguage]);

  const storageKey = useMemo(
    () => `progress:${user?.id || "guest"}:${id}`,
    [user?.id, id],
  );
  const saveTimer = useRef(null);
  // Track time spent on each module
  const moduleStartTime = useRef(Date.now());
  const moduleStartIdx = useRef(0);

  useEffect(() => {
    setSectionLessonIdx(0);
    setQuizResult(null);
  }, [activeIdx]);

  // --- Module time tracking ---
  useEffect(() => {
    if (!isEnrolled || !id) {
      // Reset timer without reporting when not enrolled
      moduleStartTime.current = Date.now();
      moduleStartIdx.current = activeIdx;
      return;
    }

    const reportTime = async (idx, startMs) => {
      const secs = Math.round((Date.now() - startMs) / 1000);
      if (secs < 2) return; // ignore accidental flickers
      try {
        await axios.post(`/courses/${id}/module-time`, { moduleIndex: idx, seconds: secs });
      } catch {
        // non-critical, ignore
      }
    };

    // Report the previous module's time when switching
    const prevIdx = moduleStartIdx.current;
    const prevStart = moduleStartTime.current;

    // Flush previous module (skip on first mount when both are 0)
    if (prevStart) reportTime(prevIdx, prevStart);

    // Start timer for new module
    moduleStartTime.current = Date.now();
    moduleStartIdx.current = activeIdx;

    // Also flush on page unload
    const handleUnload = () => { reportTime(activeIdx, moduleStartTime.current); };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, isEnrolled, id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sid = params.get("session_id");
    const doConfirm = async () => {
      try {
        setConfirming(true);
        const r = await axios.get(`/payments/confirm`, {
          params: { session_id: sid },
        });
        if (r.data?.ok) {
          setJustEnrolled(true);
          setIsEnrolled(true);
        }
      } catch {
        // ignore
      } finally {
        setConfirming(false);
        window.history.replaceState({}, "", window.location.pathname);
      }
    };
    if (sid && isAuthenticated) doConfirm();
  }, [location.search, isAuthenticated]);

  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        if (isAuthenticated) {
          const r = await axios.get(`/courses/${id}/enrolled`);
          setIsEnrolled(r.data.enrolled);
          setCertificate(r.data.certificate);
          if (r.data.enrolled) {
            const pg = await axios.get(`/courses/${id}/progress`);
            setProgress(pg.data);
          }
        }
      } catch {
        // ignore
      }
    };
    checkEnrollment();
  }, [id, isAuthenticated]);

  useEffect(() => {
    const checkPreTestStatus = async () => {
      try {
        if (isAuthenticated && isEnrolled && course?.preTest) {
          const res = await axios.get(`/courses/${id}/pretest/status`);
          setPreTestCompleted(res.data.completed);
          if (res.data.completed) {
            setShowPreTest(false);
          } else {
            // Show pre-test if not completed and it exists
            setShowPreTest(true);
          }
        }
      } catch (e) {
        console.error("Error checking pre-test status:", e);
      }
    };
    checkPreTestStatus();
  }, [isEnrolled, course, id, isAuthenticated]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`/courses/${id}`);
        setCourse(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();

    const recordView = async () => {
      try {
        if (isAuthenticated) {
          await axios.post(`/courses/${id}/view`);
        }
      } catch {
        // ignore
      }
    };
    recordView();
  }, [id, isAuthenticated]);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        if (isAuthenticated && isEnrolled) {
          const r = await axios.get(`/courses/${id}/progress`);
          if (Array.isArray(r.data?.completedIndices)) {
            setCompleted(r.data.completedIndices);
            setCompletedLessons(r.data.completedLessons || []);
            setModuleCertificates(r.data.moduleCertificates || {});
            localStorage.setItem(
              storageKey,
              JSON.stringify(r.data.completedIndices),
            );
            return;
          }
        }
      } catch {
        // ignore
      }
      // Only fall back to localStorage when enrolled; otherwise keep all locked
      if (isEnrolled) {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) setCompleted(JSON.parse(raw));
        } catch {
          // ignore
        }
      } else {
        setCompleted([]);
      }
    };
    loadProgress();
  }, [id, storageKey, isAuthenticated, isEnrolled]);

  const handlePreTestPassed = () => {
    // Mark pre-test as completed
    setPreTestCompleted(true);
    setShowPreTest(false);
  };

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(completed));
    } catch {
      // ignore
    }

    if (!isAuthenticated || !user || !isEnrolled) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await axios.put(`/courses/${id}/progress`, {
          completedIndices: completed,
          completedLessons: completedLessons,
        });
      } catch {
        // ignore
      }
    }, 100);

    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [completed, completedLessons, storageKey, id, isAuthenticated, user, isEnrolled]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await axios.post("/payments/create-checkout-session", {
        courseId: id,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } finally {
      setEnrolling(false);
    }
  };

  const submitQuiz = async ({ answers, setIndex }) => {
    try {
      // Force progress update so the backend recognizes we've completed the videos
      try {
        await axios.put(`/courses/${id}/progress`, {
          completedIndices: completed,
          completedLessons: completedLessons,
        });
      } catch (err) {
        console.error("Failed to sync progress before quiz submission:", err);
      }

      const r = await axios.post(`/courses/${id}/quiz/${activeIdx}/submit`, {
        answers,
        setIndex,
      });
      const result = r.data;

      // Store the result with additional metadata
      const enhancedResult = {
        ...result,
        timestamp: new Date().toISOString(),
        moduleIndex: activeIdx,
        moduleTitle: modules[activeIdx]?.title || `Module ${activeIdx + 1}`,
      };

      setQuizResult(enhancedResult);

      if (result.passed) {
        // Update completed state
        setCompleted((prev) => {
          if (!prev.includes(activeIdx)) {
            return [...prev, activeIdx];
          }
          return prev;
        });

        // Auto-advance to next module if exists
        setTimeout(() => {
          setActiveIdx((curr) => {
            const nextIdx = curr + 1;
            if (nextIdx < modules.length) {
              // Reset quiz result for the next module
              setQuizResult(null);
              return nextIdx;
            }
            return curr;
          });
        }, 1500); // Slightly longer delay to show success message
      } else {
        // Scroll to revision section if present
        setTimeout(() => {
          const revisionSection = document.getElementById("revision-section");
          if (revisionSection) {
            revisionSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 100);
      }

      return result;
    } catch (e) {
      console.error("Quiz submission error:", e);
      const errorMessage =
        e.response?.data?.message || "Failed to submit quiz. Please try again.";
      throw new Error(errorMessage);
    }
  };

  const handleQuizRetry = () => {
    setQuizResult(null);
  };

  const modules = useMemo(() => {
    const items = course?.contents || [];
    return items.map((it, idx) => ({
      title: it.title || `Module ${idx + 1}`,
      item: it,
      index: idx,
    }));
  }, [course]);

  useEffect(() => {
    if ((modules?.length || 0) > 0) setActiveIdx(0);
  }, [modules]);

  // Update AI Context
  useEffect(() => {
    const activeModule = modules[activeIdx];
    const item = activeModule?.item;

    // Extract lessons for context
    const lessonsList =
      item?.lessons
        ?.map((l) => `- ${l.type.toUpperCase()}: ${l.title}`)
        .join("\n") || "No specific lessons.";

    updateContext({
      title: item?.title || course?.title || "Course Detail",
      description: `Current Module: ${item?.title}\n\nModule Description: ${item?.description || course?.description || ""}\n\nAvailable Lessons:\n${lessonsList}`,
      content: `Context Source: Course Detail View\nUser Role: ${user?.role}\n\nActive Learning Material:\n${JSON.stringify(
        {
          moduleTitle: item?.title,
          lessons: item?.lessons?.map((l) => ({
            title: l.title,
            type: l.type,
            url: l.url,
          })),
          quiz: item?.quiz ? "Has Quiz" : "No Quiz",
          revisionMaterials: item?.revisionLessons ? "Available" : "None",
        },
        null,
        2,
      )}`,
    });
  }, [modules, activeIdx, course, updateContext, user]);

  const canOpen = (idx) => {
    if (!isEnrolled) return idx === 0;
    if (idx === 0) return true;
    for (let i = 0; i < idx; i++) {
      if (!completed.includes(i)) return false;
    }
    return true;
  };

  const getModuleStatus = (idx) => {
    if (!isEnrolled) return idx === 0 ? "available" : "locked";
    for (let i = 0; i < idx; i++) {
      if (!completed.includes(i)) return "locked";
    }
    if (completed.includes(idx)) return "passed";
    if (activeIdx === idx && quizResult && quizResult.passed === false)
      return "revision";
    return "available";
  };

  const renderRevisionLessons = (section) => {
    const revs = section?.revisionLessons || [];
    if (revs.length === 0) return null;

    return (
      <div id="revision-section" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            Revision Materials
          </h3>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <p className="text-amber-800">
            Review these materials to strengthen your understanding before
            retaking the quiz.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {revs.map((ls, i) => (
            <div
              key={i}
              className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {ls.type === "video" && (
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0110 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    )}
                    {ls.type === "article" && (
                      <div className="p-2 bg-green-100 rounded-lg text-green-600">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    )}
                    {!["video", "article"].includes(ls.type) && (
                      <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{ls.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {ls.description || "No description available"}
                    </p>
                    <div className="mt-2">
                      <a
                        href={ls.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Open Resource
                        <svg
                          className="w-4 h-4 ml-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!course) return <div className="p-8 text-center">Course not found</div>;

  const activeModule = modules[activeIdx];
  const item = activeModule?.item;

  const renderSectionMain = (section) => {
    const lessons = section.lessons || [];
    const current = lessons[sectionLessonIdx];

    // Check if all video lessons are completed for this module
    const hasUnwatchedVideos = lessons.some((l, lIdx) =>
      l.type === "video" && !completedLessons.includes(`${activeIdx}-${lIdx}`)
    );

    // sentinel index: lessons.length means "Assessment tab selected"
    const assessmentIdx = lessons.length;
    const isAssessmentTab = sectionLessonIdx === assessmentIdx;
    const hasQuiz = !!section.quiz?.questions?.length;

    return (
      <div className="space-y-3">
        {/* Lesson + Assessment Tabs */}
        <div className="flex flex-wrap gap-2">
          {lessons.map((ls, i) => {
            const isLessonCompleted = completedLessons.includes(`${activeIdx}-${i}`);
            return (
              <button
                key={i}
                onClick={() => setSectionLessonIdx(i)}
                className={`text-sm px-3 py-1.5 rounded border relative ${i === sectionLessonIdx ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"} ${(ls.type === 'video' && isLessonCompleted) ? "pr-8" : ""}`}
              >
                {ls.title || `Lesson ${i + 1}`}
                {(ls.type === 'video' && isLessonCompleted) && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </span>
                )}
              </button>
            );
          })}

          {/* Assessment tab — only shown to enrolled users when a quiz exists */}
          {isEnrolled && hasQuiz && (
            <button
              onClick={() => {
                if (!hasUnwatchedVideos) setSectionLessonIdx(assessmentIdx);
              }}
              title={hasUnwatchedVideos ? "Watch all videos first to unlock the quiz" : "Take module assessment"}
              className={`text-sm px-3 py-1.5 rounded border flex items-center gap-1.5 transition-colors
                ${isAssessmentTab
                  ? "bg-indigo-700 text-white border-indigo-700"
                  : hasUnwatchedVideos
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                }`}
            >
              {hasUnwatchedVideos ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <span>📝</span>
              )}
              Assessment
            </button>
          )}
        </div>

        {/* Main content: video player OR quiz */}
        {isAssessmentTab && isEnrolled ? (
          <div className="pt-2">
            {section.quiz?.questions?.length ? (
              <ProtectedQuizWrapper
                key={activeIdx}
                hasResult={!!quizResult}
                onForceSubmit={() => { submitQuiz({ answers: [], setIndex: 0 }); }}
              >
                <Quiz
                  key={activeIdx}
                  item={{
                    title: section.title,
                    quizQuestions: section.quiz.questions,
                    index: activeIdx,
                  }}
                  onSubmit={submitQuiz}
                  lastResult={quizResult}
                  onRetry={handleQuizRetry}
                  progress={{ completedIndices: completed }}
                  courseId={id}
                  moduleIndex={activeIdx}
                />
              </ProtectedQuizWrapper>
            ) : (
              <div className="text-sm text-gray-500">No quiz configured for this module.</div>
            )}
          </div>
        ) : current ? (
          <Player
            item={current}
            isCompleted={completedLessons.includes(`${activeIdx}-${sectionLessonIdx}`)}
            onComplete={() => {
              const lessonKey = `${activeIdx}-${sectionLessonIdx}`;
              if (!completedLessons.includes(lessonKey)) {
                setCompletedLessons(prev => [...prev, lessonKey]);
              }
            }}
          />
        ) : (
          <div className="text-sm text-gray-500">
            No lessons in this module.
          </div>
        )}

        {isEnrolled &&
          quizResult &&
          quizResult.passed === false &&
          renderRevisionLessons(section)}
        {(isEnrolled ||
          user?.role === "instructor" ||
          user?.role === "admin") && (
            <ModuleScratchpad
              isOpen={codeEditorOpen}
              setIsOpen={setCodeEditorOpen}
              code={editorCode}
              setCode={setEditorCode}
              language={editorLanguage}
              setLanguage={setEditorLanguage}
            />
          )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8">
        {/* Success Message */}
        {(justEnrolled || confirming) && (
          <div
            className={`mb-8 rounded-2xl p-5 border-2 flex items-start gap-4 ${confirming ? "bg-blue-50 border-blue-300 text-blue-900" : "bg-emerald-50 border-emerald-300 text-emerald-900"}`}
          >
            <span className="text-3xl mt-1">{confirming ? "⏳" : "✨"}</span>
            <div>
              <div className="font-bold text-lg">
                {confirming ? "Confirming Payment" : "Welcome to the Course!"}
              </div>
              <div className="text-sm opacity-85">
                {confirming
                  ? "Processing your enrollment..."
                  : "You now have full access to all course materials and can start learning!"}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Course Header with Image */}
            {!activeModule && (
              <div className="group rounded-3xl overflow-hidden shadow-2xl bg-white border border-gray-700 hover:shadow-3xl transition-all duration-300">
                <div className="relative h-64 md:h-96 overflow-hidden bg-gray-200">
                  <img
                    src={course.thumbnailUrl || fallbackThumbnail}
                    onError={(e) => {
                      e.currentTarget.src = fallbackThumbnail;
                    }}
                    alt={`${course.title} thumbnail`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>
              </div>
            )}

            {/* Course Info Header */}
            <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 shadow-lg border-2 border-blue-200 relative">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl md:text-5xl font-black bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                    {course.title}
                  </h1>
                  <div className="flex items-center gap-3 text-gray-800">
                    <span className="text-3xl">👨‍🏫</span>
                    <div>
                      <div className="text-sm opacity-80 text-gray-700">
                        Instructor
                      </div>
                      <div className="font-bold text-lg text-gray-900">
                        {course.createdBy?.name}
                      </div>
                    </div>
                  </div>
                </div>
                {user?.role === "instructor" &&
                  user?.id === course.createdBy?._id && (
                    <button
                      onClick={() => navigate(`/instructor/courses/${id}/edit`)}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg border-2 border-blue-200 hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit Course
                    </button>
                  )}
              </div>
            </div>

            {/* Content Display */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg border-2 border-gray-200 space-y-6">
              {/* Pre-test Blocking (if enrolled but pre-test not completed) */}
              {isEnrolled && course?.preTest && !preTestCompleted && (
                <div className="min-h-96 flex flex-col items-center justify-center space-y-6">
                  <div className="text-center space-y-4">
                    <div className="text-7xl">📝</div>
                    <h2 className="text-4xl font-bold text-gray-900">
                      Pre-Test Required
                    </h2>
                    <p className="text-xl text-gray-600 max-w-md">
                      Complete the pre-test to unlock course materials and
                      proceed with learning
                    </p>
                  </div>

                  <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6 max-w-md w-full">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">✓</span>
                        <div>
                          <p className="font-semibold text-blue-900">
                            Diagnostic Assessment
                          </p>
                          <p className="text-sm text-blue-700">
                            Evaluate your baseline knowledge
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">✓</span>
                        <div>
                          <p className="font-semibold text-blue-900">
                            Learn at Your Pace
                          </p>
                          <p className="text-sm text-blue-700">
                            Access all materials after completing the test
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">✓</span>
                        <div>
                          <p className="font-semibold text-blue-900">
                            Progress Tracking
                          </p>
                          <p className="text-sm text-blue-700">
                            Get personalized learning recommendations
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPreTest(true)}
                    className="px-8 py-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl transition-all hover:scale-105 flex items-center gap-2"
                  >
                    <span>📝</span>
                    Start Pre-Test Now
                  </button>
                </div>
              )}

              {/* Normal Content (only if pre-test is completed or not required) */}
              {!isEnrolled || !course?.preTest || preTestCompleted ? (
                <>
                  {item?.type === "section" ? (
                    renderSectionMain(item)
                  ) : item?.type === "coding_problem" ? (
                    <CodingProblemSolver item={item} />
                  ) : (
                    <>
                      <Player
                        item={item}
                        isCompleted={completedLessons.includes(`${activeIdx}-0`)}
                        onComplete={() => {
                          const lessonKey = `${activeIdx}-0`;
                          if (!completedLessons.includes(lessonKey)) {
                            setCompletedLessons(prev => [...prev, lessonKey]);
                          }
                        }}
                      />
                      {item?.type === "quiz" && isEnrolled && (
                        <div className="space-y-6">
                          <ProtectedQuizWrapper
                            key={activeIdx}
                            hasResult={!!quizResult}
                            onForceSubmit={() => submitQuiz({ answers: [], setIndex: 0 })}
                          >
                            <Quiz
                              key={activeIdx}
                              item={{ ...item, index: activeIdx }}
                              onSubmit={submitQuiz}
                              lastResult={quizResult}
                              onRetry={handleQuizRetry}
                              progress={{ completedIndices: completed }}
                              courseId={id}
                              moduleIndex={activeIdx}
                            />
                          </ProtectedQuizWrapper>
                          {quizResult &&
                            !quizResult.passed &&
                            item.revisionLessons?.length > 0 && (
                              <div className="mt-8">
                                {renderRevisionLessons(item)}
                              </div>
                            )}
                        </div>
                      )}
                      {(isEnrolled ||
                        user?.role === "instructor" ||
                        user?.role === "admin") && (
                          <ModuleScratchpad
                            isOpen={codeEditorOpen}
                            setIsOpen={setCodeEditorOpen}
                            code={editorCode}
                            setCode={setEditorCode}
                            language={editorLanguage}
                            setLanguage={setEditorLanguage}
                          />
                        )}
                    </>
                  )}
                </>
              ) : null}
            </div>

            {/* About Course */}
            <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-3xl p-8 shadow-lg border-2 border-gray-200">
              <h2 className="text-3xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                <span>📚</span>
                About this Course
              </h2>
              <p className="text-gray-800 leading-relaxed text-lg">
                {course.description}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Enrollment Card - Sticky */}
            <div className="sticky top-8 bg-linear-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 shadow-2xl border-2 border-blue-500 text-white">
              <div className="text-4xl font-black mb-2">
                ₹{course?.priceInINR}
              </div>
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">♾️</span>
                  <span className="font-semibold">Lifetime Access</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <span className="font-semibold">Certificate Included</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📚</span>
                  <span className="font-semibold">
                    {modules.length} Modules
                  </span>
                </div>
              </div>

              {isAuthenticated && user?.role === "user" ? (
                isEnrolled ? (
                  <div className="space-y-4">
                    {certificate?.issued ? (
                      <div className="w-full bg-gradient-to-br from-yellow-400 to-amber-600 text-white border-2 border-yellow-200 rounded-2xl px-4 py-4 text-center font-bold text-lg flex flex-col items-center justify-center gap-2 shadow-lg animate-pulse hover:animate-none transition-all cursor-pointer"
                        onClick={() => { setSelectedCert(certificate); setSelectedModuleCertTitle(""); setShowCertificateModal(true); }}>
                        <div className="flex gap-2 items-center">
                          <span className="text-2xl">🏆</span>
                          <span>View Certificate</span>
                        </div>
                        <div className="text-xs font-medium opacity-80">Download your PDF</div>
                      </div>
                    ) : (
                      <div className="w-full bg-white text-green-600 border-2 border-white rounded-2xl px-4 py-4 text-center font-bold text-lg flex items-center justify-center gap-2 shadow-lg">
                        <span>✓</span>
                        <span>You're Enrolled</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 text-indigo-600 px-4 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-xl border-2 border-white"
                  >
                    {enrolling ? "⏳ Redirecting..." : "→ Enroll Now"}
                  </button>
                )
              ) : (
                <div className="bg-white/30 text-white rounded-2xl px-4 py-4 text-center text-sm font-bold border-2 border-white/50">
                  👤 Login as Student to Enroll
                </div>
              )}
            </div>

            {/* Modules List */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="text-3xl">📋</span>
                  Modules
                </h2>
                <span className="bg-linear-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full">
                  {modules.length} Total
                </span>
              </div>
              <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                {modules.map((m, idx) => {
                  const unlocked = canOpen(idx);
                  const isActive = idx === activeIdx;
                  const st = getModuleStatus(idx);
                  return (
                    <div key={m.index} className="flex flex-col gap-2">
                      <button
                        onClick={() => unlocked && setActiveIdx(idx)}
                        disabled={!unlocked}
                        className={`w-full text-left px-4 py-4 rounded-2xl transition-all border-2 font-medium text-base ${isActive
                          ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-lg scale-105"
                          : unlocked
                            ? "bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-900 hover:border-blue-500"
                            : "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate flex-1">{m.title}</span>
                          <div className="flex items-center overflow-hidden">
                            {moduleCertificates[idx.toString()]?.issued && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCert(moduleCertificates[idx.toString()]);
                                  setSelectedModuleCertTitle(m.title);
                                  setShowCertificateModal(true);
                                }}
                                className="mr-2 text-xs px-2 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-bold rounded shadow hover:shadow-md transition-all flex items-center gap-1 flex-shrink-0"
                                title="View Module Certificate"
                              >
                                🏆 Cert
                              </button>
                            )}
                            <span
                              className={`text-xs px-3 py-1.5 flex-shrink-0 rounded-full font-bold whitespace-nowrap ml-1 ${st === "passed"
                                ? "bg-emerald-100 text-emerald-700"
                                : st === "revision"
                                  ? "bg-amber-100 text-amber-700"
                                  : st === "available"
                                    ? isActive
                                      ? "bg-white/20 text-white"
                                      : "bg-blue-100 text-blue-700"
                                    : "bg-gray-200 text-gray-600"
                                }`}
                            >
                              {st === "passed"
                                ? "✓ Done"
                                : st === "revision"
                                  ? "📖 Study"
                                  : st === "available"
                                    ? "🔓 Ready"
                                    : "🔒 Locked"}
                            </span>
                          </div>
                        </div>
                      </button>
                      {isActive &&
                        isEnrolled &&
                        st === "revision" &&
                        m.item?.type === "section" &&
                        renderRevisionLessons(m.item)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showCertificateModal && (
          <CertificateModal
            isOpen={showCertificateModal}
            onClose={() => setShowCertificateModal(false)}
            certificate={selectedCert}
            course={course}
            studentName={user?.name || "Student"}
            moduleTitle={selectedModuleCertTitle}
          />
        )}

        {showPreTest && (
          <PreTest
            preTest={course.preTest}
            courseId={id}
            onPassedPreTest={handlePreTestPassed}
            onCancelPreTest={() => setShowPreTest(false)}
            onSkipPreTest={handlePreTestPassed}
          />
        )}
      </div>
    </div>
  );
};

export default CourseDetail;
