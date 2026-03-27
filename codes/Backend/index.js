const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5667;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? "https://smart-course-trackss.vercel.app" : "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://bharath:Bharath@cluster0.1gkorum.mongodb.net/finalyearproject', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/code', require('./routes/code'));
app.use('/api/ai', require('./routes/ai'));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'LMS Backend Server is running!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
