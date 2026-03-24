const express = require('express');
const router = express.Router();

// Get supported programming languages
router.get('/languages', (req, res) => {
  try {
    // This can be extended to fetch from a database in the future
    const supportedLanguages = [
      { id: 'javascript', name: 'JavaScript', icon: '⚡' },
      { id: 'jsx', name: 'React JSX', icon: '⚛️' },
      { id: 'node', name: 'Node.js', icon: '🟢' },
      { id: 'express', name: 'Express', icon: '🚀' },
      { id: 'tailwind', name: 'Tailwind CSS', icon: '🎨' },
      { id: 'html', name: 'HTML', icon: '🌐' }
    ];
    
    res.json(supportedLanguages);
  } catch (error) {
    console.error('Error fetching supported languages:', error);
    res.status(500).json({ message: 'Failed to fetch supported languages' });
  }
});

module.exports = router;
