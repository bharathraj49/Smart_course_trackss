const express = require('express');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const CourseView = require('../models/CourseView');
const ModuleTime = require('../models/ModuleTime');
const PreTest = require('../models/PreTest');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

function validateContents(contents = []) {
  for (let i = 0; i < contents.length; i++) {
    const c = contents[i];
    if (!c || !c.type || !c.title) {
      return `Content item ${i + 1} must have type and title`;
    }
    if (c.type === 'section') {
      // validate lessons
      const lessons = Array.isArray(c.lessons) ? c.lessons : [];
      if (lessons.length === 0) return `Section ${i + 1} must include at least 1 lesson`;
      for (let li = 0; li < lessons.length; li++) {
        const l = lessons[li];
        if (!l.type || !l.title) return `Section ${i + 1} lesson ${li + 1} must include type and title`;
        if (l.type === 'code') {
          if (!l.codingProblem || !l.codingProblem.description) return `Section ${i + 1} lesson ${li + 1} (code) must include a description`;
        } else {
          if (!l.url) return `Section ${i + 1} lesson ${li + 1} must include a URL`;
        }
      }
      // validate quiz
      if (!c.quiz || !Array.isArray(c.quiz.questions) || c.quiz.questions.length === 0) {
        return `Section ${i + 1} must include a quiz with at least 1 question`;
      }
      for (let qi = 0; qi < c.quiz.questions.length; qi++) {
        const q = c.quiz.questions[qi];
        if (!q.question) return `Section ${i + 1} quiz question ${qi + 1} is missing text`;
        if (!Array.isArray(q.options) || q.options.length < 2) return `Section ${i + 1} quiz question ${qi + 1} must have at least 2 options`;
        if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) return `Section ${i + 1} quiz question ${qi + 1} has invalid correct index`;
      }
      // validate revision lessons (optional)
      const revs = Array.isArray(c.revisionLessons) ? c.revisionLessons : [];
      for (let ri = 0; ri < revs.length; ri++) {
        const l = revs[ri];
        if (!l.type || !l.title || !l.url) return `Section ${i + 1} revision lesson ${ri + 1} must include type, title, and URL`;
      }
      continue;
    }
    if (c.type === 'coding_problem') {
      if (!c.codingProblem || !c.codingProblem.description) return `Content item ${i + 1} (coding_problem) must include a description`;
      continue;
    }
    if (c.type !== 'quiz') {
      if (!c.url) return `Content item ${i + 1} (${c.type}) must include a URL`;
    } else {
      const qs = Array.isArray(c.quizQuestions) ? c.quizQuestions : [];
      if (qs.length === 0) return `Quiz item ${i + 1} must include at least 1 question`;
      for (let qi = 0; qi < qs.length; qi++) {
        const q = qs[qi];
        if (!q.question) return `Quiz ${i + 1} question ${qi + 1} is missing text`;
        if (!Array.isArray(q.options) || q.options.length < 2) return `Quiz ${i + 1} question ${qi + 1} must have at least 2 options`;
        if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) return `Quiz ${i + 1} question ${qi + 1} has invalid correct answer index`;
      }
    }
  }
  return null;
}

// Public: list courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .populate('createdBy', 'name role');

    // Enrich courses with pretest data
    const coursesWithPreTest = await Promise.all(
      courses.map(async (course) => {
        const courseObj = course.toObject();
        const preTest = await PreTest.findOne({ courseId: course._id });
        if (preTest) {
          courseObj.preTest = {
            questions: preTest.questions,
            passMarkPercent: preTest.passPercent,
            category: preTest.category,
            tests: preTest.tests
          };
        }
        return courseObj;
      })
    );

    res.json(coursesWithPreTest);
  } catch (e) {
    console.error('Error fetching courses:', e);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

// Public: get course by id
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('createdBy', 'name role');

    if (!course || (!course.isPublished && !req.user)) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Add pretest data if exists
    const courseObj = course.toObject();
    const preTest = await PreTest.findOne({ courseId: course._id });
    if (preTest) {
      courseObj.preTest = {
        questions: preTest.questions,
        passMarkPercent: preTest.passPercent,
        category: preTest.category,
        tests: preTest.tests
      };
    }

    res.json(courseObj);
  } catch (e) {
    console.error('Error fetching course:', e);
    res.status(404).json({ message: 'Course not found' });
  }
});

const MIN_PUBLISH_PRICE_INR = 50;

// Create course (instructor/admin)
router.post('/', authenticateToken, authorizeRoles('instructor', 'admin'), async (req, res) => {
  try {
    const { title, description, priceInINR, thumbnailUrl, contents, isPublished, preTest, isFree } = req.body;

    if (isPublished && !isFree && Number(priceInINR) < MIN_PUBLISH_PRICE_INR) {
      return res.status(400).json({ message: `Published courses must be priced at least ₹${MIN_PUBLISH_PRICE_INR}.` });
    }

    const validationError = validateContents(contents || []);
    if (validationError) return res.status(400).json({ message: validationError });

    const course = await Course.create({
      title,
      description,
      priceInINR: isFree ? 0 : priceInINR,
      thumbnailUrl,
      contents: contents || [],
      isPublished: !!isPublished,
      isFree: !!isFree,
      createdBy: req.user._id
    });

    // Save pre-test if provided
    if (preTest && (preTest.questions?.length > 0 || preTest.tests?.length > 0)) {
      await PreTest.findOneAndUpdate(
        { courseId: course._id },
        {
          courseId: course._id,
          questions: preTest.questions || [],
          passPercent: preTest.passMarkPercent || 70,
          category: preTest.category || 'general',
          tests: preTest.tests || []
        },
        { upsert: true, new: true }
      );
    }

    res.status(201).json(course);
  } catch (e) {
    res.status(400).json({ message: 'Failed to create course', error: e.message });
  }
});

// Update course (owner admin)
router.put('/:id', authenticateToken, authorizeRoles('instructor', 'admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const fields = ['title', 'description', 'priceInINR', 'thumbnailUrl', 'contents', 'isPublished', 'isFree'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) course[f] = req.body[f];
    });

    if (course.isFree) {
      course.priceInINR = 0;
    }

    if (course.isPublished && !course.isFree && Number(course.priceInINR) < MIN_PUBLISH_PRICE_INR) {
      return res.status(400).json({ message: `Published courses must be priced at least ₹${MIN_PUBLISH_PRICE_INR}.` });
    }

    const validationError = validateContents(course.contents || []);
    if (validationError) return res.status(400).json({ message: validationError });

    await course.save();

    // Save pre-test if provided
    if (req.body.preTest && (req.body.preTest.questions?.length > 0 || req.body.preTest.tests?.length > 0)) {
      await PreTest.findOneAndUpdate(
        { courseId: course._id },
        {
          courseId: course._id,
          questions: req.body.preTest.questions || [],
          passPercent: req.body.preTest.passMarkPercent || 70,
          category: req.body.preTest.category || 'general',
          tests: req.body.preTest.tests || []
        },
        { upsert: true, new: true }
      );
    }

    res.json(course);
  } catch (e) {
    res.status(400).json({ message: 'Failed to update course', error: e.message });
  }
});

// Delete course (owner admin)
router.delete('/:id', authenticateToken, authorizeRoles('instructor', 'admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    await course.deleteOne();
    res.json({ message: 'Course deleted' });
  } catch (e) {
    res.status(400).json({ message: 'Failed to delete course' });
  }
});

// Get my courses (instructor)
router.get('/me/created', authenticateToken, authorizeRoles('instructor', 'admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const courses = await Course.find(filter).sort({ createdAt: -1 });
    res.json(courses);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

// Get my enrollments (student)
router.get('/me/enrollments', authenticateToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user._id, status: 'active' })
      .populate('course');
    res.json(enrollments);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch enrollments' });
  }
});

// Progress routes (kept below)
router.get('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const enr = await Enrollment.findOne({ user: req.user._id, course: req.params.id, status: 'active' });
    if (!enr) return res.status(404).json({ message: 'Not enrolled' });
    res.json(enr.progress || { completedIndices: [], completedLessons: [], lastUpdatedAt: null });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch progress' });
  }
});

router.put('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { completedIndices, completedLessons } = req.body;
    if (completedIndices && !Array.isArray(completedIndices)) {
      return res.status(400).json({ message: 'completedIndices must be an array of numbers' });
    }
    if (completedLessons && !Array.isArray(completedLessons)) {
      return res.status(400).json({ message: 'completedLessons must be an array of strings' });
    }

    const updateFields = { 'progress.lastUpdatedAt': new Date() };
    if (completedIndices) updateFields['progress.completedIndices'] = completedIndices;
    if (completedLessons) updateFields['progress.completedLessons'] = completedLessons;

    const enr = await Enrollment.findOneAndUpdate(
      { user: req.user._id, course: req.params.id, status: 'active' },
      { $set: updateFields },
      { new: true }
    );
    if (!enr) return res.status(404).json({ message: 'Not enrolled' });
    res.json(enr.progress);
  } catch (e) {
    res.status(500).json({ message: 'Failed to update progress' });
  }
});

// Get enrollment status for a course (student)
router.get('/:id/enrolled', authenticateToken, async (req, res) => {
  try {
    const enr = await Enrollment.findOne({ user: req.user._id, course: req.params.id, status: 'active' });
    res.json({ enrolled: !!enr, certificate: enr?.certificate || null });
  } catch (e) {
    res.status(500).json({ message: 'Failed to check enrollment' });
  }
});

// Record a course view (student)
router.post('/:id/view', authenticateToken, async (req, res) => {
  try {
    const courseId = req.params.id;
    const view = await CourseView.findOneAndUpdate(
      { user: req.user._id, course: courseId },
      { $inc: { count: 1 }, $set: { lastViewedAt: new Date() } },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to record view' });
  }
});

// Helper: resolve which question set to show for a given attempt index
// Uses questionSets[attemptIdx] if available, falls back to questions (backward compat)
function resolveQuestionSet(quiz, attemptIdx) {
  const sets = quiz?.questionSets || [];
  if (sets.length > 0) {
    // If more attempts than sets, cycle from the last set
    const setIdx = Math.min(attemptIdx, sets.length - 1);
    return { questions: sets[setIdx] || [], setIndex: setIdx };
  }
  // Backward compat: single questions array is always "set 0"
  return { questions: quiz?.questions || [], setIndex: 0 };
}

// Start a quiz attempt — returns the question set for this attempt + attempt info
router.get('/:id/quiz/:index/start', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const idx = Number(req.params.index);
    if (Number.isNaN(idx) || idx < 0 || idx >= course.contents.length) {
      return res.status(400).json({ message: 'Invalid module index' });
    }

    const enr = await Enrollment.findOne({ user: req.user._id, course: course._id, status: 'active' });
    if (!enr) return res.status(403).json({ message: 'Not enrolled' });

    const item = course.contents[idx];
    let quiz = null;
    let maxAttempts = 3;
    if (item.type === 'section') {
      quiz = item.quiz;
      maxAttempts = item.quiz?.maxAttempts ?? 3;
    } else if (item.type === 'quiz') {
      // Treat flat quiz fields as a quiz object
      quiz = { questions: item.quizQuestions || [], questionSets: item.questionSets || [] };
      maxAttempts = item.maxAttempts ?? 3;
    } else {
      return res.status(400).json({ message: 'This module has no quiz' });
    }

    const key = String(idx);
    const current = enr.progress?.quizResults?.get(key);
    const attempts = current?.attempts ?? 0;
    const alreadyPassed = current?.passed ?? false;
    const attemptsLeft = alreadyPassed ? 0 : Math.max(0, maxAttempts - attempts);

    // Pick question set for this attempt
    const { questions, setIndex } = resolveQuestionSet(quiz, attempts);

    res.json({
      questions,      // the actual questions to show (no IDs, no correct answers)
      setIndex,       // sent back with submit for server-side grading
      attempts,
      maxAttempts,
      attemptsLeft,
      alreadyPassed,
      lastScore: current?.scorePercent ?? null
    });
  } catch (e) {
    console.error('quiz start error', e);
    res.status(500).json({ message: 'Failed to start quiz' });
  }
});

// Submit quiz for a module index
router.post('/:id/quiz/:index/submit', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const idx = Number(req.params.index);
    if (Number.isNaN(idx) || idx < 0 || idx >= course.contents.length) {
      return res.status(400).json({ message: 'Invalid module index' });
    }

    const enr = await Enrollment.findOne({ user: req.user._id, course: course._id, status: 'active' });
    if (!enr) return res.status(403).json({ message: 'Not enrolled' });

    // Enforce sequential: all previous must be completed
    for (let i = 0; i < idx; i++) {
      if (!enr.progress?.completedIndices?.includes(i)) {
        return res.status(400).json({ message: 'Previous modules must be completed first' });
      }
    }

    const item = course.contents[idx];

    // Check if all videos in this module are watched
    if (item.type === 'section' && item.lessons) {
      const completedLessons = enr.progress?.completedLessons || [];
      const missedVideo = item.lessons.find((lesson, lessonIdx) => {
        if (lesson.type === 'video') {
          return !completedLessons.includes(`${idx}-${lessonIdx}`);
        }
        return false;
      });
      if (missedVideo) {
        return res.status(403).json({ message: 'You must watch all video lessons in this module before taking the quiz.' });
      }
    }

    let quiz = null;
    let passMark = 70;
    let maxAttempts = 3;
    if (item.type === 'quiz') {
      quiz = { questions: item.quizQuestions || [], questionSets: item.questionSets || [] };
      passMark = item.passMarkPercent || 70;
      maxAttempts = item.maxAttempts ?? 3;
    } else if (item.type === 'section') {
      quiz = item.quiz;
      passMark = item.quiz?.passMarkPercent || 70;
      maxAttempts = item.quiz?.maxAttempts ?? 3;
    } else {
      return res.status(400).json({ message: 'This module is not a quiz' });
    }

    // Check attempt limit
    if (!enr.progress) enr.progress = {};
    if (!enr.progress.completedIndices) enr.progress.completedIndices = [];
    if (!enr.progress.quizResults) enr.progress.quizResults = new Map();

    const key = String(idx);
    const existing = enr.progress.quizResults.get(key);
    const attempts = existing?.attempts ?? 0;
    const alreadyPassed = existing?.passed ?? false;

    if (!alreadyPassed && attempts >= maxAttempts) {
      return res.status(403).json({
        message: 'Maximum attempts reached for this quiz.',
        attemptsLeft: 0,
        maxAttempts
      });
    }

    const { answers, setIndex } = req.body;

    // Resolve the same question set used during /start (based on attempt count at start time)
    const { questions } = resolveQuestionSet(quiz, typeof setIndex === 'number' ? setIndex : attempts);

    if (!questions.length) return res.status(400).json({ message: 'No questions configured for this quiz' });
    if (!Array.isArray(answers) || answers.length !== questions.length) {
      return res.status(400).json({ message: 'Invalid answers payload' });
    }

    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correctIndex) correct++; });

    const scorePercent = Math.round((correct / questions.length) * 100);
    const pass = scorePercent >= passMark;
    const newAttempts = attempts + 1;
    const attemptsLeft = Math.max(0, maxAttempts - newAttempts);

    enr.progress.quizResults.set(key, {
      scorePercent,
      passed: alreadyPassed || pass,
      attempts: newAttempts
    });

    if (pass) {
      const set = new Set(enr.progress.completedIndices);
      set.add(idx);
      enr.progress.completedIndices = Array.from(set).sort((a, b) => a - b);
    }

    console.log('Quiz submission:', { idx, pass, scorePercent, newAttempts, maxAttempts });

    enr.progress.lastUpdatedAt = new Date();
    await enr.save();

    res.json({ scorePercent, passed: pass, attempts: newAttempts, maxAttempts, attemptsLeft });
  } catch (e) {
    console.error('quiz submit error', e);
    res.status(500).json({ message: 'Failed to submit quiz' });
  }
});



// Submit pre-test for a course (for enrollment gate)
router.post('/:courseId/pretest/submit', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { score, answers } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Check if pretest exists in PreTest collection
    const preTest = await PreTest.findOne({ courseId });
    if (!preTest || !preTest.questions || preTest.questions.length === 0) {
      return res.status(400).json({ message: 'No pre-test for this course' });
    }

    // Find or create enrollment record to track pre-test score
    let enrollment = await Enrollment.findOne({ user: req.user._id, course: courseId });
    if (!enrollment) {
      enrollment = new Enrollment({
        user: req.user._id,
        course: courseId,
        status: 'pre_test_passed', // Mark status as pre-test passed
        enrolledAt: new Date(),
        progress: {
          preTestScore: score,
          completedIndices: []
        }
      });
    } else {
      if (!enrollment.progress) enrollment.progress = {};
      enrollment.progress.preTestScore = score;
      enrollment.status = 'pre_test_passed';
    }

    await enrollment.save();
    res.json({
      message: 'Pre-test submitted',
      score,
      passed: score >= (preTest.passPercent || 70)
    });
  } catch (e) {
    console.error('pre-test submit error', e);
    res.status(500).json({ message: 'Failed to submit pre-test' });
  }
});

// Get pre-test status for a course (enrollment gate check)
router.get('/:courseId/pretest/status', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Check if pretest exists in PreTest collection
    const preTest = await PreTest.findOne({ courseId });
    const hasPreTest = !!preTest;

    // Check if enrolled
    const enrollment = await Enrollment.findOne({ user: req.user._id, course: courseId });
    if (!enrollment) {
      return res.json({ hasPreTest, completed: false });
    }

    res.json({
      hasPreTest,
      completed: enrollment.status === 'pre_test_passed' || enrollment.status === 'active',
      score: enrollment.progress?.preTestScore || null
    });
  } catch (e) {
    console.error('pre-test status error', e);
    res.status(500).json({ message: 'Failed to fetch pre-test status' });
  }
});

// Instructor analytics for their courses
router.get('/me/analytics', authenticateToken, authorizeRoles('instructor', 'admin'), async (req, res) => {
  try {
    const match = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const courses = await Course.find(match).select('_id title');
    const courseIds = courses.map(c => c._id);

    // Enrollments count per course
    const enrollAgg = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds }, status: 'active' } },
      { $group: { _id: '$course', enrollments: { $sum: 1 } } }
    ]);

    // Views per course
    const viewAgg = await CourseView.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: '$course', views: { $sum: '$count' } } }
    ]);

    // Watched modules (sum of completedIndices length across enrollments)
    const watchedAgg = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds }, status: 'active' } },
      { $project: { course: 1, completedCount: { $size: { $ifNull: ['$progress.completedIndices', []] } } } },
      { $group: { _id: '$course', watched: { $sum: '$completedCount' } } }
    ]);

    const byId = {};
    courses.forEach(c => (byId[String(c._id)] = { courseId: c._id, title: c.title, enrollments: 0, views: 0, watched: 0 }));
    enrollAgg.forEach(e => { if (byId[String(e._id)]) byId[String(e._id)].enrollments = e.enrollments; });
    viewAgg.forEach(v => { if (byId[String(v._id)]) byId[String(v._id)].views = v.views; });
    watchedAgg.forEach(w => { if (byId[String(w._id)]) byId[String(w._id)].watched = w.watched; });

    res.json(Object.values(byId));
  } catch (e) {
    console.error('analytics error', e);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

// Student: report time spent on a module
router.post('/:courseId/module-time', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleIndex, seconds } = req.body;

    if (typeof moduleIndex !== 'number' || typeof seconds !== 'number' || seconds <= 0) {
      return res.status(400).json({ message: 'moduleIndex (number) and seconds (positive number) are required' });
    }

    // Only active enrollments count
    const enr = await Enrollment.findOne({ user: req.user._id, course: courseId, status: 'active' });
    if (!enr) return res.status(403).json({ message: 'Not enrolled' });

    await ModuleTime.findOneAndUpdate(
      { user: req.user._id, course: courseId, moduleIndex },
      { $inc: { totalSeconds: seconds, sessions: 1 } },
      { upsert: true, new: true }
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('module-time error', e);
    res.status(500).json({ message: 'Failed to record module time' });
  }
});

// Instructor: per-module avg time analytics for a specific course
router.get('/:courseId/module-analytics', authenticateToken, authorizeRoles('instructor', 'admin'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select('createdBy contents');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    // Aggregate: per module, avg seconds and distinct student count
    const agg = await ModuleTime.aggregate([
      { $match: { course: course._id } },
      {
        $group: {
          _id: '$moduleIndex',
          avgSeconds: { $avg: '$totalSeconds' },
          studentCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Build full list based on course contents (fill zeros for missing modules)
    const byIdx = {};
    agg.forEach(a => { byIdx[a._id] = { avgSeconds: Math.round(a.avgSeconds), studentCount: a.studentCount }; });

    const result = course.contents.map((item, idx) => ({
      moduleIndex: idx,
      moduleTitle: item.title || `Module ${idx + 1}`,
      avgSeconds: byIdx[idx]?.avgSeconds ?? 0,
      studentCount: byIdx[idx]?.studentCount ?? 0
    }));

    res.json(result);
  } catch (e) {
    console.error('module-analytics error', e);
    res.status(500).json({ message: 'Failed to fetch module analytics' });
  }
});

// Fetch all enrolled students for an instructor's course
router.get('/:id/students', authenticateToken, authorizeRoles('instructor', 'admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const enrollments = await Enrollment.find({ course: req.params.id })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    const moduleTimes = await ModuleTime.find({ course: req.params.id }).lean();

    const result = enrollments.map(enr => {
      const userTimes = moduleTimes.filter(mt => mt.user.toString() === enr.user._id.toString());
      return {
        ...enr,
        moduleTimes: userTimes
      };
    });

    res.json(result);
  } catch (e) {
    console.error('students fetch error', e);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
});

// Issue certificate for a specific enrolled student
router.post('/:id/students/:userId/certificate', authenticateToken, authorizeRoles('instructor', 'admin'), async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.params.userId;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const enrollment = await Enrollment.findOne({ course: courseId, user: userId });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    // Validate course completion: Student must have completed all modules
    const requiredModulesCount = course.contents.length;
    const completedIndices = enrollment.progress?.completedIndices || [];

    // Allow instructor to manually override or strict enforce. For now, strict enforce completions.
    if (completedIndices.length < requiredModulesCount) {
      return res.status(400).json({ message: `Student has not completed all modules (${completedIndices.length}/${requiredModulesCount}).` });
    }

    if (enrollment.certificate?.issued) {
      return res.status(400).json({ message: 'Certificate already issued.' });
    }

    const certificateId = `CERT-${courseId.slice(-4).toUpperCase()}-${userId.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    enrollment.certificate = {
      issued: true,
      issuedAt: new Date(),
      certificateId
    };

    await enrollment.save();

    res.json({ message: 'Certificate issued successfully', certificateId });
  } catch (e) {
    console.error('Issue certificate error:', e);
    res.status(500).json({ message: 'Failed to issue certificate' });
  }
});

// Issue certificate for a specific enrolled student's module
router.post('/:id/students/:userId/modules/:moduleIndex/certificate', authenticateToken, authorizeRoles('instructor', 'admin'), async (req, res) => {
  try {
    const { id: courseId, userId, moduleIndex } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const enrollment = await Enrollment.findOne({ course: courseId, user: userId });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    const mIdx = parseInt(moduleIndex, 10);
    const completedIndices = enrollment.progress?.completedIndices || [];

    if (!completedIndices.includes(mIdx)) {
      return res.status(400).json({ message: `Student has not completed module ${mIdx + 1}.` });
    }

    if (!enrollment.progress.moduleCertificates) {
      enrollment.progress.moduleCertificates = new Map();
    }

    if (enrollment.progress.moduleCertificates.has(moduleIndex) && enrollment.progress.moduleCertificates.get(moduleIndex).issued) {
      return res.status(400).json({ message: 'Module certificate already issued.' });
    }

    // Generate formal Certificate ID
    const crypto = require('crypto');
    const certificateId = `MOD-CERT-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;

    enrollment.progress.moduleCertificates.set(moduleIndex, {
      issued: true,
      issuedAt: new Date(),
      certificateId
    });

    // Mark document as modified for mixed/map types
    enrollment.markModified('progress.moduleCertificates');

    await enrollment.save();

    res.json({ message: 'Module certificate issued successfully', certificateId });
  } catch (e) {
    console.error('Issue module certificate error:', e);
    res.status(500).json({ message: 'Failed to issue module certificate' });
  }
});

module.exports = router;
