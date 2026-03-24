const mongoose = require('mongoose');

/**
 * Tracks cumulative time (in seconds) a student has spent on each module of a course.
 * Updated via POST /courses/:courseId/module-time (students report on leaving a module).
 */
const moduleTimeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    moduleIndex: { type: Number, required: true },
    totalSeconds: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 }   // number of times the module was opened
}, { timestamps: true });

moduleTimeSchema.index({ user: 1, course: 1, moduleIndex: 1 }, { unique: true });

module.exports = mongoose.model('ModuleTime', moduleTimeSchema);
