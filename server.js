import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Resolve paths in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Central server-side data stores (In-memory database)
let onlineUsers = {};
let sessionLogs = [];
let sharedAssignments = [
  { id: '1', title: 'Unit 1 Kickoff', grade: 4, unit: 1, lesson: 1, active: true },
  { id: '2', title: 'Grade 5 Spelling Challenge', grade: 5, unit: 1, lesson: 1, active: true }
];
let sharedStudentProgress = {};
let rosterCustomized = false;
let sharedStudents = [
  { id: '100', name: 'Alice', grade: 4, pin: '1234', class: '4A' },
  { id: '101', name: 'Bob', grade: 4, pin: '1234', class: '4A' },
  { id: '102', name: 'Charlie', grade: 4, pin: '1234', class: '4B' },
  { id: '103', name: 'David', grade: 4, pin: '1234', class: '4B' },
  { id: '104', name: 'Emma', grade: 5, pin: '1234', class: '5A' },
  { id: '105', name: 'Frank', grade: 5, pin: '1234', class: '5A' },
  { id: '106', name: 'Grace', grade: 5, pin: '1234', class: '5B' },
  { id: '107', name: 'Henry', grade: 5, pin: '1234', class: '5B' }
];

// Clean up offline users every 8 seconds
setInterval(() => {
  const now = Date.now();
  for (const name in onlineUsers) {
    if (now - onlineUsers[name].lastActive > 15000) {
      delete onlineUsers[name];
    }
  }
}, 8000);

// API Endpoints
app.post('/api/heartbeat', (req, res) => {
  const { name, role, grade, sessionTime, exerciseTime, isExerciseActive, device } = req.body;
  if (name) {
    const now = Date.now();
    const existingUser = onlineUsers[name];
    const firstSeen = existingUser ? existingUser.firstSeen : now;
    
    onlineUsers[name] = {
      name,
      role,
      grade: grade || 'N/A',
      device: device || 'Unknown',
      sessionTime: sessionTime || 0,
      exerciseTime: exerciseTime || 0,
      isExerciseActive: !!isExerciseActive,
      firstSeen,
      lastActive: now
    };
  }
  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  const { name } = req.body;
  if (name && onlineUsers[name]) {
    delete onlineUsers[name];
  }
  res.json({ success: true });
});

app.get('/api/status', (req, res) => {
  res.json({
    onlineUsers: Object.values(onlineUsers),
    serverTime: Date.now()
  });
});

app.post('/api/sync-logs', (req, res) => {
  const { logs } = req.body;
  if (Array.isArray(logs)) {
    logs.forEach(log => {
      if (log && log.id && !sessionLogs.some(l => l.id === log.id)) {
        sessionLogs.push(log);
      }
    });
    sessionLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  res.json({ success: true, logs: sessionLogs.slice(0, 200) });
});

app.post('/api/sync-assignments', (req, res) => {
  const { role, assignments } = req.body;
  if ((role === 'teacher' || role === 'admin') && Array.isArray(assignments)) {
    sharedAssignments = assignments;
  }
  res.json({ success: true, assignments: sharedAssignments });
});

app.post('/api/sync-progress', (req, res) => {
  const { studentProgress } = req.body;
  if (studentProgress && typeof studentProgress === 'object') {
    for (const studentName in studentProgress) {
      if (!sharedStudentProgress[studentName]) {
        sharedStudentProgress[studentName] = {};
      }
      const localStudentMap = studentProgress[studentName];
      const serverStudentMap = sharedStudentProgress[studentName];

      for (const key in localStudentMap) {
        try {
          if (key === '_totalExerciseTime') {
            serverStudentMap._totalExerciseTime = Math.max(
              serverStudentMap._totalExerciseTime || 0,
              localStudentMap._totalExerciseTime || 0
            );
            continue;
          }

          const localWord = localStudentMap[key];
          if (!localWord || typeof localWord !== 'object') continue;
          const serverWord = serverStudentMap[key];

          if (!serverWord) {
            serverStudentMap[key] = localWord;
          } else {
            const localTime = localWord.lastUpdated ? new Date(localWord.lastUpdated).getTime() : 0;
            const serverTime = serverWord.lastUpdated ? new Date(serverWord.lastUpdated).getTime() : 0;
            if (localTime > serverTime) {
              serverStudentMap[key] = localWord;
            }
          }
        } catch (err) {
          console.error("Error merging progress key:", key, err);
        }
      }
    }
  }
  res.json({ success: true, studentProgress: sharedStudentProgress });
});

app.post('/api/reset-progress', (req, res) => {
  const { studentName } = req.body;
  if (studentName) {
    if (studentName === 'ALL') {
      sharedStudentProgress = {};
      sharedStudents = [
        { id: '100', name: 'Alice', grade: 4, pin: '1234', class: '4A' },
        { id: '101', name: 'Bob', grade: 4, pin: '1234', class: '4A' },
        { id: '102', name: 'Charlie', grade: 4, pin: '1234', class: '4B' },
        { id: '103', name: 'David', grade: 4, pin: '1234', class: '4B' },
        { id: '104', name: 'Emma', grade: 5, pin: '1234', class: '5A' },
        { id: '105', name: 'Frank', grade: 5, pin: '1234', class: '5A' },
        { id: '106', name: 'Grace', grade: 5, pin: '1234', class: '5B' },
        { id: '107', name: 'Henry', grade: 5, pin: '1234', class: '5B' }
      ];
      rosterCustomized = false;
    } else {
      delete sharedStudentProgress[studentName];
    }
  }
  res.json({ success: true, studentProgress: sharedStudentProgress });
});

app.post('/api/sync-students', (req, res) => {
  const { role, students } = req.body;
  if (Array.isArray(students) && (role === 'teacher' || role === 'admin')) {
    const isDefault = (list) => {
      return list.length === 8 && list.some(s => s.name === 'Alice') && list.some(s => s.name === 'Bob');
    };
    
    if (!isDefault(students)) {
      sharedStudents = students;
      rosterCustomized = true;
    } else if (!rosterCustomized) {
      sharedStudents = students;
    }
  }
  res.json({ success: true, students: sharedStudents });
});

app.post('/api/clear-logs', (req, res) => {
  sessionLogs.length = 0;
  res.json({ success: true, logs: [] });
});

// Serve compiled static assets
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback all other routes to index.html for SPA router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Production server running on port ${PORT}`);
});
