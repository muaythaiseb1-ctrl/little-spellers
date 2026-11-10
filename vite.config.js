import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createAuth, createLoginLimiter } from './server/auth.js'
import { defaultStudents } from './src/data/defaultStudents.js'

// In-memory data store for local network synchronization
const onlineUsers = {};
const sessionLogs = [];
let sharedAssignments = [
  { id: '1', title: 'Unit 1 Kickoff', grade: 4, unit: 1, lesson: 1, active: true },
  { id: '2', title: 'Grade 5 Spelling Challenge', grade: 5, unit: 1, lesson: 1, active: true }
];
let sharedStudentProgress = {};
let rosterCustomized = false;
let sharedStudents = [...defaultStudents];

// Clean up offline users every 8 seconds. Do not keep one-off Vite commands
// such as production builds alive after compilation finishes.
const onlineUserCleanup = setInterval(() => {
  const now = Date.now();
  for (const name in onlineUsers) {
    if (now - onlineUsers[name].lastActive > 15000) {
      delete onlineUsers[name];
    }
  }
}, 8000);
onlineUserCleanup.unref?.();

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'api-sync-server',
      configureServer(server) {
        // Passwords come from .env (not prefixed with VITE_, so they never reach the browser).
        const auth = createAuth({ ...loadEnv(mode, process.cwd(), ''), ...process.env });
        const loginLimiter = createLoginLimiter();

        server.middlewares.use((req, res, next) => {
          const urlPath = req.url.split('?')[0];
          
          if (urlPath.startsWith('/api/')) {
            res.setHeader('Content-Type', 'application/json');
            
            // Helper to parse JSON body
            const getBody = (cb) => {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  cb(JSON.parse(body));
                } catch {
                  cb({});
                }
              });
            };
            const isStaffRequest = () => auth.isStaff(auth.userFromRequest(req));
            const sendError = (status, error) => {
              res.statusCode = status;
              res.end(JSON.stringify({ success: false, error }));
            };

            if (urlPath === '/api/login' && req.method === 'POST') {
              getBody((data) => {
                // Limit per device and account, so one child's typos do not lock out a whole
                // classroom sharing the school's internet connection.
                const body = data || {};
                const key = `${req.socket?.remoteAddress || 'unknown'}|${body.role}|${body.studentName || body.username || ''}`;
                if (loginLimiter.isBlocked(key)) {
                  return sendError(429, 'Too many wrong tries. Please wait 10 minutes.');
                }
                const result = auth.login(body, sharedStudents);
                if (!result.ok) {
                  if (result.status === 401) loginLimiter.recordFailure(key);
                  return sendError(result.status, result.error);
                }
                loginLimiter.reset(key);
                res.end(JSON.stringify({ success: true, user: result.user, token: result.token }));
              });
              return;
            }

            if (urlPath === '/api/heartbeat' && req.method === 'POST') {
              getBody((data) => {
                const { name, role, grade, sessionTime, exerciseTime, isExerciseActive, device } = data;
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
                res.end(JSON.stringify({ success: true }));
              });
              return;
            }

            if (urlPath === '/api/logout' && req.method === 'POST') {
              getBody((data) => {
                const { name } = data;
                if (name && onlineUsers[name]) {
                  delete onlineUsers[name];
                }
                res.end(JSON.stringify({ success: true }));
              });
              return;
            }

            if (urlPath === '/api/status' && req.method === 'GET') {
              res.end(JSON.stringify({
                onlineUsers: Object.values(onlineUsers),
                serverTime: Date.now()
              }));
              return;
            }

            if (urlPath === '/api/sync-logs' && req.method === 'POST') {
              getBody((data) => {
                const { logs } = data;
                if (Array.isArray(logs)) {
                  logs.forEach(log => {
                    if (log && log.id && !sessionLogs.some(l => l.id === log.id)) {
                      sessionLogs.push(log);
                    }
                  });
                  // Sort newest first
                  sessionLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                }
                // Only return top 200 logs to keep payload size small
                const trimmedLogs = sessionLogs.slice(0, 200);
                res.end(JSON.stringify({ success: true, logs: trimmedLogs }));
              });
              return;
            }

            if (urlPath === '/api/sync-assignments' && req.method === 'POST') {
              getBody((data) => {
                const { assignments } = data;
                if (Array.isArray(assignments) && isStaffRequest()) {
                  sharedAssignments = assignments;
                }
                res.end(JSON.stringify({ success: true, assignments: sharedAssignments }));
              });
              return;
            }

            if (urlPath === '/api/sync-assignments' && req.method === 'GET') {
              res.end(JSON.stringify({ success: true, assignments: sharedAssignments }));
              return;
            }

            if (urlPath === '/api/sync-progress' && req.method === 'POST') {
              getBody((data) => {
                const { studentProgress } = data;
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
                res.end(JSON.stringify({ success: true, studentProgress: sharedStudentProgress }));
              });
              return;
            }

            if (urlPath === '/api/sync-progress' && req.method === 'GET') {
              res.end(JSON.stringify({ success: true, studentProgress: sharedStudentProgress }));
              return;
            }

            if (urlPath === '/api/reset-progress' && req.method === 'POST') {
              if (!isStaffRequest()) {
                sendError(403, 'Teacher or admin login required.');
                return;
              }
              getBody((data) => {
                const { studentName } = data;
                if (studentName) {
                  if (studentName === 'ALL') {
                    sharedStudentProgress = {};
                    sharedStudents = [...defaultStudents];
                    rosterCustomized = false;
                  } else {
                    delete sharedStudentProgress[studentName];
                  }
                }
                res.end(JSON.stringify({ success: true, studentProgress: sharedStudentProgress }));
              });
              return;
            }

            if (urlPath === '/api/sync-students' && req.method === 'POST') {
              getBody((data) => {
                const { students } = data;
                if (Array.isArray(students)) {
                  const isDefault = (list) => {
                    return list.length === 8 && list.some(s => s.name === 'Alice') && list.some(s => s.name === 'Bob');
                  };
                  
                  if (isStaffRequest()) {
                    if (!isDefault(students)) {
                      sharedStudents = students;
                      rosterCustomized = true;
                    } else if (!rosterCustomized) {
                      sharedStudents = students;
                    }
                  }
                }
                res.end(JSON.stringify({ success: true, students: sharedStudents }));
              });
              return;
            }

            if (urlPath === '/api/sync-students' && req.method === 'GET') {
              res.end(JSON.stringify({ success: true, students: sharedStudents }));
              return;
            }

            if (urlPath === '/api/clear-logs' && req.method === 'POST') {
              if (!isStaffRequest()) {
                sendError(403, 'Teacher or admin login required.');
                return;
              }
              sessionLogs.length = 0;
              res.end(JSON.stringify({ success: true, logs: [] }));
              return;
            }
          }
          next();
        });
      }
    }
  ],
}))
