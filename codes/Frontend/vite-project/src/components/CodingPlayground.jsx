import React, { useState } from "react";
import AdvancedIDE from "./AdvancedIDE/AdvancedIDE";

const CodingPlayground = () => {
  const [language, setLanguage] = useState("javascript");

  // Default starter code based on language
  const starters = {
    javascript: `// JavaScript Playground
function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("Developer"));
console.log("Welcome to your Smart Course Track IDE!");`,
    node: `// Node.js Playground
const data = [1, 2, 3, 4, 5];
const doubled = data.map(n => n * 2);
console.log("Doubled array:", doubled);

// Try passing a custom input from the panel below!
if (typeof input !== 'undefined') {
  console.log("Received custom input:", input);
}
`,
    react: `// React Preview Playground
// Make sure to \`export default\` your component so it renders to the preview pane!
import React, { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Hello, React!</h2>
      <button 
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
        onClick={() => setCount(c => c + 1)}
      >
        Clicks: {count}
      </button>
    </div>
  );
};

export default Counter;`,
    express: `// Express.js Mock Sandbox
// Build a mock backend and test it using the HTTP Tester tab!
const express = require('express');
const app = express();

app.use(express.json());

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
];

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const user = { id: Date.now(), ...req.body };
  users.push(user);
  res.status(201).json(user);
});

app.listen(3000, () => {
  console.log("Server running. Go to HTTP Tester tab to try requests on /api/users");
});`
  };

  const [code, setCode] = useState(starters.javascript);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    setCode(starters[lang] || "");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>👨‍💻</span> Coding Practice Arena
          </h1>
          <p className="text-sm text-gray-500">
            Practice your skills with our advanced IDE
          </p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="px-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="javascript">JavaScript</option>
            <option value="node">Node.js</option>
            <option value="react">React.js</option>
            <option value="express">Express.js Mock</option>
          </select>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 p-6 h-[calc(100vh-80px)]">
        <AdvancedIDE initialCode={code} initialLanguage={language} height="100%" />
      </div>

      <div className="px-6 py-4 bg-white border-t border-gray-200 text-center text-sm text-gray-500">
        💡 Tip: Use console.log() to see your output. This environment runs in
        your browser.
      </div>
    </div>
  );
};

export default CodingPlayground;
