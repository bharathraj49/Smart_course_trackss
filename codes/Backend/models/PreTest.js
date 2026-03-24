const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctIndex: { type: Number, required: true }
}, { _id: false });

const preTestSchema = new mongoose.Schema({
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true,
    unique: true
  },
  category: { type: [String], default: [] },
  questions: { type: [questionSchema], default: [] },
  tests: { type: [mongoose.Schema.Types.Mixed], default: [] },
  passPercent: { type: Number, default: 70 }
}, { timestamps: true });

module.exports = mongoose.model('PreTest', preTestSchema);
