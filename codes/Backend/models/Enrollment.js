const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  status: { type: String, enum: ['pending', 'active', 'pre_test_passed', 'cancelled'], default: 'pending' },
  stripeSessionId: { type: String },
  stripePaymentIntentId: { type: String },
  progress: {
    preTestScore: { type: Number }, // Pre-test score (0-100)
    completedIndices: { type: [Number], default: [] },
    completedLessons: { type: [String], default: [] }, // Format: "moduleIndex-lessonIndex"
    quizResults: { type: Map, of: new mongoose.Schema({ scorePercent: Number, passed: Boolean, attempts: { type: Number, default: 0 } }, { _id: false }) },
    moduleCertificates: {
      type: Map,
      of: new mongoose.Schema({
        issued: { type: Boolean, default: false },
        issuedAt: { type: Date },
        certificateId: { type: String }
      }, { _id: false })
    },
    lastUpdatedAt: { type: Date }
  },
  certificate: {
    issued: { type: Boolean, default: false },
    issuedAt: { type: Date },
    certificateId: { type: String }
  }
}, { timestamps: true });

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);


