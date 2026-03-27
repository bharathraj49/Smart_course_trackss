const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true, validate: v => Array.isArray(v) && v.length >= 2 },
  correctIndex: { type: Number, required: true }
}, { _id: false });

const quizSchema = new mongoose.Schema({
  passMarkPercent: { type: Number, default: 70 },
  maxAttempts: { type: Number, default: 3, min: 1, max: 10 },
  // Each entry is a set of questions for one attempt (attempt 1 → questionSets[0], etc.)
  // Backward compat: 'questions' is used as attempt-1 set if questionSets is empty
  questions: { type: [quizQuestionSchema], default: [] },
  questionSets: { type: [[quizQuestionSchema]], default: [] }
}, { _id: false });

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true }
}, { _id: false });

const lessonSchema = new mongoose.Schema({
  type: { type: String, enum: ['video', 'pdf', 'note', 'code'], required: true },
  title: { type: String, required: true },
  url: { type: String }, // Optional for code type
  durationMinutes: { type: Number },
  codingProblem: {
    description: { type: String },
    starterCode: { type: String },
    language: { type: String, default: 'javascript' },
    testCases: { type: [testCaseSchema], default: [] }
  }
}, { _id: false });

const contentItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['video', 'pdf', 'note', 'quiz', 'section', 'coding_problem'],
    required: true
  },
  title: { type: String, required: true },
  url: { type: String },
  durationMinutes: { type: Number },
  // Quiz-specific (flat quiz module)
  quizQuestions: {
    type: [quizQuestionSchema],
    default: [],
    validate: v => Array.isArray(v) && v.length >= 0 // Ensure array structure
  },
  passMarkPercent: { type: Number, default: 70 },
  // Section-specific
  lessons: {
    type: [lessonSchema],
    default: [],
    validate: v => Array.isArray(v) && v.length >= 0 // Ensure array structure
  },
  quiz: {
    type: quizSchema,
    default: () => ({ passMarkPercent: 70, questions: [] }) // Default quiz structure
  },
  revisionLessons: {
    type: [lessonSchema],
    default: [],
    validate: v => Array.isArray(v) && v.length >= 0 // Ensure array structure
  },
  // Coding Problem specific
  codingProblem: {
    description: { type: String },
    starterCode: { type: String },
    language: { type: String, default: 'javascript' },
    testCases: { type: [testCaseSchema], default: [] }
  }
}, { _id: false });

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  priceInINR: { type: Number, required: true, min: 0 },
  thumbnailUrl: { type: String },
  preTest: { type: quizSchema, default: null }, // Course-level pre-test for enrollment gate
  contents: { type: [contentItemSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublished: { type: Boolean, default: false },
  isFree: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);


