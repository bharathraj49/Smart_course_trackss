const mongoose = require('mongoose');

const courseViewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  count: { type: Number, default: 0 },
  lastViewedAt: { type: Date }
}, { timestamps: true });

courseViewSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('CourseView', courseViewSchema); 