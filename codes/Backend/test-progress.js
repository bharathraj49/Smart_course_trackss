require('dotenv').config();
const mongoose = require('mongoose');
const Enrollment = require('./models/Enrollment');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const enrs = await Enrollment.find({ "progress.completedLessons": { $exists: true, $not: {$size: 0} } }).limit(5);
  console.log("Enrollments with completedLessons:", enrs.length);
  for (const e of enrs) {
    console.log(`Enrollment ID: ${e._id}, User: ${e.user}, Course: ${e.course}, Progress:`, e.progress);
  }

  const enrs2 = await Enrollment.find({}).limit(2);
  console.log("Any enrollments:", enrs2.length);
  for (const e of enrs2) {
    console.log(`Enrollment ID: ${e._id}, User: ${e.user}, Course: ${e.course}, Progress:`, e.progress);
  }

  process.exit(0);
}

test().catch(console.error);
