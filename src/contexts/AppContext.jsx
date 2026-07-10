import React, { createContext, useState, useEffect, useRef } from 'react';
import { defaultStudents } from '../data/defaultStudents';

// We will dynamically import the compiled vocabulary.json.
// If it hasn't finished compiling yet, we'll fallback to an empty array.
import rawVocabulary from '../data/vocabulary.json';

export const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // 1. Vocabulary State (Admin can modify)
  const [vocabulary, setVocabulary] = useState(() => {
    const saved = localStorage.getItem('little_spellers_vocab');
    let list = saved ? JSON.parse(saved) : rawVocabulary || [];
    
    // In-place migration/correction of Grade 4 and 5 words for existing databases
    let modified = false;
    const corrections = {
      // Grade 4
      1004: { thai: 'พ่อแม่' },
      1014: { thai: 'ป้าย' },
      1018: { thai: 'ใส่ใจ' },
      1022: { thai: 'ขยัน' },
      1023: { thai: 'ชอบช่วยเหลือ' },
      1041: { thai: 'เกมส่งของขวัญ' },
      1047: { thai: 'เคลื่อนที่อย่างรวดเร็ว' },
      1052: { thai: 'พูดเบาๆ' },
      1064: { thai: 'ลำโพง' },
      1070: { thai: 'รีโมทคอนโทรล' },
      1079: { thai: 'เป่าผมให้แห้ง' },
      1092: { thai: 'ลูกวัว' },
      1093: { thai: 'ลูกเจี๊ยบ' },
      1095: { thai: 'ลูกแกะ' },
      1117: { thai: 'ปลอกคอ' },
      1119: { thai: 'แมลงวัน' },
      1120: { thai: 'สายจูงสุนัข' },
      1130: { thai: 'ตัวละคร' },
      1179: { thai: 'ล้างจาน' },
      1191: { word: 'write in a diary' },
      1203: { thai: 'เห็นมนุษย์ต่างดาว' },
      1209: { thai: 'ทำหาย / แพ้' },
      // Grade 5
      1253: { thai: 'วิทยาศาสตร์' },
      1270: { thai: 'วิชา' },
      1278: { thai: 'ลายตาราง' },
      1281: { thai: 'ลายจุด' },
      1282: { thai: 'ลายทาง' },
      1289: { thai: 'รองเท้ากีฬา' },
      1297: { thai: 'เหล็กดัดฟัน' },
      1298: { thai: 'แว่นตาว่ายน้ำ / แว่นตานิรภัย' },
      1308: { thai: 'ต่อจิ๊กซอว์' },
      1309: { thai: 'เล่นโยคะ' },
      1321: { thai: 'รายการทำอาหาร' },
      1328: { thai: 'คีย์บอร์ด (เครื่องดนตรี)' },
      1334: { thai: 'เลื่อนหิมะ' },
      1376: { thai: 'โดรน' },
      1395: { thai: 'อวกาศ' },
      1399: { thai: 'ร้านขายยา' },
      1400: { thai: 'ร้านเดลี่' },
      1408: { thai: 'โรงละคร' },
      1413: { thai: 'ได้รับ / ไปถึง' },
      1419: { thai: 'ข้าม / เหนือ' },
      1420: { thai: 'ผ่าน' },
      1425: { word: 'skyscraper' },
      1431: { thai: 'หลังเที่ยงวัน (p.m.)' },
      1432: { thai: 'สี่โมงสิบห้านาที' },
      1433: { thai: 'อีกสิบห้านาทีห้าโมง' },
      1439: { thai: 'วินาที' },
      1440: { thai: 'ไปหยิบมา' },
      1445: { thai: 'จัดของให้เป็นระเบียบ' },
      1454: { word: 'May', thai: 'พฤษภาคม' },
      1464: { thai: 'กระดูกหัก' },
      1465: { thai: 'แผลไฟไหม้' },
      1466: { thai: 'แผลถูกบาด' },
      1476: { thai: 'เก็บของที่ซื้อมา' },
      1477: { thai: 'เอาผ้าออกจากเครื่องซักผ้า' },
      1479: { thai: 'ใส่จานในเครื่องล้างจาน' },
      1484: { thai: 'ของตกแต่ง' },
      1488: { thai: 'กล่องใส่ของ / ภาชนะ' },
      1492: { thai: 'เตาพลังงานแสงอาทิตย์' }
    };

    list = list.map(item => {
      const corr = corrections[item.id];
      if (corr) {
        let changed = false;
        if (corr.word && item.word !== corr.word) {
          item.word = corr.word;
          changed = true;
        }
        if (corr.thai && item.thai !== corr.thai) {
          item.thai = corr.thai;
          changed = true;
        }
        if (changed) {
          modified = true;
        }
      }
      return item;
    });

    if (modified) {
      localStorage.setItem('little_spellers_vocab', JSON.stringify(list));
    }
    return list;
  });

  // 2. Class List State (Teacher can upload CSV)
  const [students, setStudents] = useState(() => {
    const saved = localStorage.getItem('little_spellers_students');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.some(s => s.name === 'Alice')) {
          return defaultStudents;
        }
        return parsed;
      } catch (e) {
        return defaultStudents;
      }
    }
    return defaultStudents;
  });

  // 3. Current User Session
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('little_spellers_session');
    return saved ? JSON.parse(saved) : null;
  });

  // 4. Session Logs for Admin (Persistent)
  const [sessionLogs, setSessionLogs] = useState(() => {
    const saved = localStorage.getItem('little_spellers_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // 5. Student Progress Tracker
  // Maps studentId -> { wordId: { attempts: 0, correct: false, score: 0, wrongCount: 0, lastUpdated } }
  const [studentProgress, setStudentProgress] = useState(() => {
    const saved = localStorage.getItem('little_spellers_progress');
    return saved ? JSON.parse(saved) : {};
  });

  // 6. Assignments State
  const [assignments, setAssignments] = useState(() => {
    const saved = localStorage.getItem('little_spellers_assignments');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Unit 1 Kickoff', grade: 4, unit: 1, lesson: 1, active: true },
      { id: '2', title: 'Grade 5 Spelling Challenge', grade: 5, unit: 1, lesson: 1, active: true }
    ];
  });

  // 7. Live Activity Tracking States
  const [isExerciseActive, setIsExerciseActive] = useState(false);
  const [sessionExerciseTime, setSessionExerciseTime] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(() => {
    const saved = sessionStorage.getItem('little_spellers_session_start');
    return saved ? parseInt(saved, 10) : null;
  });
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Sync refs to prevent heartbeat closure issues
  const isExerciseActiveRef = useRef(isExerciseActive);
  const sessionExerciseTimeRef = useRef(sessionExerciseTime);
  const currentUserRef = useRef(currentUser);
  const assignmentsRef = useRef(assignments);
  const studentProgressRef = useRef(studentProgress);
  const studentsRef = useRef(students);

  useEffect(() => {
    isExerciseActiveRef.current = isExerciseActive;
  }, [isExerciseActive]);

  useEffect(() => {
    sessionExerciseTimeRef.current = sessionExerciseTime;
  }, [sessionExerciseTime]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    assignmentsRef.current = assignments;
  }, [assignments]);

  useEffect(() => {
    studentProgressRef.current = studentProgress;
  }, [studentProgress]);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('little_spellers_vocab', JSON.stringify(vocabulary));
  }, [vocabulary]);

  useEffect(() => {
    localStorage.setItem('little_spellers_students', JSON.stringify(students));
    syncStudentsWithServer();
  }, [students]);

  useEffect(() => {
    localStorage.setItem('little_spellers_logs', JSON.stringify(sessionLogs));
  }, [sessionLogs]);

  useEffect(() => {
    localStorage.setItem('little_spellers_progress', JSON.stringify(studentProgress));
    if (currentUser?.role === 'student') {
      syncProgressWithServer();
    }
  }, [studentProgress]);

  useEffect(() => {
    localStorage.setItem('little_spellers_assignments', JSON.stringify(assignments));
    if (currentUser?.role === 'teacher' || currentUser?.role === 'admin') {
      syncAssignmentsWithServer();
    }
  }, [assignments]);

  // Helper to detect device
  const getDeviceType = () => {
    const width = window.innerWidth;
    if (width < 768) return 'Mobile';
    if (width <= 1024) return 'Tablet';
    return 'PC';
  };

  // Sync session logs with server in-memory db
  function syncLogsWithServer(logsToSync) {
    const savedLogs = localStorage.getItem('little_spellers_logs');
    const localLogs = logsToSync || (savedLogs ? JSON.parse(savedLogs) : []);
    
    fetch('/api/sync-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: localLogs })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.logs) {
          setSessionLogs(prev => {
            if (prev.length !== data.logs.length || (prev[0]?.id !== data.logs[0]?.id)) {
              return data.logs;
            }
            return prev;
          });
        }
      })
      .catch(err => console.error("Log sync error:", err));
  }

  // Sync assignments with server in-memory store
  function syncAssignmentsWithServer() {
    fetch('/api/sync-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        role: currentUserRef.current?.role,
        assignments: (currentUserRef.current?.role === 'teacher' || currentUserRef.current?.role === 'admin') ? assignmentsRef.current : null 
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.assignments) {
          setAssignments(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.assignments)) {
              return data.assignments;
            }
            return prev;
          });
        }
      })
      .catch(err => console.error("Sync assignments error:", err));
  }

  // Sync progress data with server in-memory store
  function syncProgressWithServer() {
    fetch('/api/sync-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentProgress: studentProgressRef.current })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.studentProgress) {
          setStudentProgress(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.studentProgress)) {
              return data.studentProgress;
            }
            return prev;
          });
        }
      })
      .catch(err => console.error("Sync progress error:", err));
  }

  // Sync students roster with server in-memory store
  function syncStudentsWithServer() {
    fetch('/api/sync-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        role: currentUserRef.current?.role,
        students: studentsRef.current 
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.students) {
          setStudents(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.students)) {
              return data.students;
            }
            return prev;
          });
        }
      })
      .catch(err => console.error("Sync students roster error:", err));
  }

  // 1-second interval to increment student's exercise durations
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student' || !isExerciseActive) return;

    const intervalId = setInterval(() => {
      setSessionExerciseTime(prev => prev + 1);
      setStudentProgress(prev => {
        const studentMap = prev[currentUser.name] || {};
        const currentTotal = studentMap._totalExerciseTime || 0;
        return {
          ...prev,
          [currentUser.name]: {
            ...studentMap,
            _totalExerciseTime: currentTotal + 1
          }
        };
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [currentUser, isExerciseActive]);

  // Heartbeat synchronizer (every 5 seconds)
  useEffect(() => {
    if (!currentUser) {
      setIsExerciseActive(false);
      setSessionExerciseTime(0);
      setSessionStartTime(null);
      sessionStorage.removeItem('little_spellers_session_start');
      return;
    }

    let start = sessionStartTime;
    if (!start) {
      start = Date.now();
      sessionStorage.setItem('little_spellers_session_start', start.toString());
      setSessionStartTime(start);
    }

    const performHeartbeat = () => {
      const sessionTimeSec = Math.floor((Date.now() - start) / 1000);

      fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentUser.name,
          role: currentUser.role,
          grade: currentUser.grade,
          sessionTime: sessionTimeSec,
          exerciseTime: currentUser.role === 'student' ? sessionExerciseTimeRef.current : 0,
          isExerciseActive: isExerciseActiveRef.current,
          device: getDeviceType()
        })
      }).catch(err => console.error("Heartbeat error:", err));

      syncLogsWithServer();
      syncAssignmentsWithServer();
      syncProgressWithServer();
      syncStudentsWithServer();

      // Fetch live statuses for admin/teachers
      if (currentUser.role === 'admin' || currentUser.role === 'teacher') {
        fetch('/api/status')
          .then(res => res.json())
          .then(data => {
            if (data && data.onlineUsers) {
              setOnlineUsers(data.onlineUsers);
            }
          })
          .catch(err => console.error("Status fetch error:", err));
      }
    };

    // Run heartbeat immediately on log in / state change
    performHeartbeat();

    const intervalId = setInterval(performHeartbeat, 5000);
    return () => clearInterval(intervalId);
  }, [currentUser, isExerciseActive, sessionStartTime]);

  // Initial fetch of assignments and progress from server on mount
  useEffect(() => {
    fetch('/api/sync-assignments')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.assignments) {
          setAssignments(data.assignments);
        }
      })
      .catch(err => console.error("Initial assignments load error:", err));

    fetch('/api/sync-progress')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.studentProgress) {
          setStudentProgress(data.studentProgress);
        }
      })
      .catch(err => console.error("Initial progress load error:", err));
  }, []);

  // Log action
  const logSessionEvent = (name, role, grade, action) => {
    const newLog = {
      id: Date.now().toString(),
      name,
      role,
      grade: grade || 'N/A',
      action,
      device: getDeviceType(),
      timestamp: new Date().toISOString()
    };
    
    // Update local state
    setSessionLogs(prev => {
      const updated = [newLog, ...prev];
      // Instantly sync logs with server
      syncLogsWithServer(updated);
      return updated;
    });
  };

  // Login handler
  const loginUser = (name, role, grade) => {
    const sessionData = { name, role, grade };
    const start = Date.now();
    
    sessionStorage.setItem('little_spellers_session', JSON.stringify(sessionData));
    sessionStorage.setItem('little_spellers_session_start', start.toString());
    
    setSessionStartTime(start);
    setSessionExerciseTime(0);
    setCurrentUser(sessionData);
    
    logSessionEvent(name, role, grade, 'Login');
  };

  // Logout handler
  const logoutUser = () => {
    if (currentUser) {
      logSessionEvent(currentUser.name, currentUser.role, currentUser.grade, 'Logout');
      
      // Notify server immediately
      fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: currentUser.name })
      }).catch(err => console.error("Logout request error:", err));

      sessionStorage.removeItem('little_spellers_session');
      sessionStorage.removeItem('little_spellers_session_start');
      
      setIsExerciseActive(false);
      setSessionExerciseTime(0);
      setSessionStartTime(null);
      setCurrentUser(null);
    }
  };

  // Update progress for a student
  const updateProgress = (studentId, wordId, correct, scoreDelta = 10, wrongInput = null) => {
    setStudentProgress(prev => {
      const studentMap = prev[studentId] || {};
      const wordStats = studentMap[wordId] || { attempts: 0, correct: false, wrongCount: 0, score: 0, mistakes: [] };
      
      const mistakes = [...(wordStats.mistakes || [])];
      if (!correct && wrongInput) {
        mistakes.push({
          timestamp: new Date().toISOString(),
          input: wrongInput
        });
      }

      const updatedWordStats = {
        attempts: wordStats.attempts + 1,
        correct: correct ? true : wordStats.correct,
        wrongCount: correct ? wordStats.wrongCount : wordStats.wrongCount + 1,
        score: Math.max(0, wordStats.score + (correct ? scoreDelta : -2)),
        mistakes: mistakes,
        lastUpdated: new Date().toISOString()
      };

      return {
        ...prev,
        [studentId]: {
          ...studentMap,
          [wordId]: updatedWordStats
        }
      };
    });
  };

  // Reset student progress
  const resetStudentProgress = (studentId) => {
    // Update local state first
    setStudentProgress(prev => {
      const copy = { ...prev };
      delete copy[studentId];
      return copy;
    });

    // Notify server to delete progress for this student
    fetch('/api/reset-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentName: studentId })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.studentProgress) {
          setStudentProgress(data.studentProgress);
        }
      })
      .catch(err => console.error("Reset progress server error:", err));
  };

  // Add/Edit Student
  const addOrUpdateStudent = (student) => {
    setStudents(prev => {
      const exists = prev.some(s => s.id === student.id);
      if (exists) {
        return prev.map(s => s.id === student.id ? student : s);
      } else {
        return [...prev, student];
      }
    });
  };

  // Delete Student
  const deleteStudent = (studentId) => {
    const student = students.find(s => String(s.id) === String(studentId));
    setStudents(prev => prev.filter(s => String(s.id) !== String(studentId)));
    if (student) {
      resetStudentProgress(student.name);
    }
  };

  // Admin Vocabulary modifier
  const updateVocabularyWord = (updatedWord) => {
    setVocabulary(prev => prev.map(w => w.id === updatedWord.id ? updatedWord : w));
  };

  const deleteVocabularyWord = (wordId) => {
    setVocabulary(prev => prev.filter(w => w.id !== wordId));
  };

  const addVocabularyWord = (newWord) => {
    setVocabulary(prev => [...prev, newWord]);
  };

  const clearAllLogs = () => {
    setSessionLogs([]);
    localStorage.setItem('little_spellers_logs', JSON.stringify([]));
    fetch('/api/clear-logs', {
      method: 'POST'
    }).catch(err => console.error("Clear logs server error:", err));
  };

  // Merge single student progress and logs imported by teacher
  const mergeStudentProgress = (importedData) => {
    const { studentName, progress, logs } = importedData;
    if (!studentName || !progress) return false;

    // 1. Merge progress
    setStudentProgress(prev => {
      const studentMap = prev[studentName] || {};
      const importedMap = progress || {};
      
      const newStudentMap = { ...studentMap };
      Object.keys(importedMap).forEach(wordId => {
        const existingWord = studentMap[wordId] || { attempts: 0, correct: false, wrongCount: 0, score: 0 };
        const importedWord = importedMap[wordId] || { attempts: 0, correct: false, wrongCount: 0, score: 0 };
        
        newStudentMap[wordId] = {
          attempts: Math.max(existingWord.attempts, importedWord.attempts),
          correct: existingWord.correct || importedWord.correct,
          wrongCount: Math.max(existingWord.wrongCount, importedWord.wrongCount),
          score: Math.max(existingWord.score, importedWord.score),
          lastUpdated: importedWord.lastUpdated || existingWord.lastUpdated
        };
      });

      return {
        ...prev,
        [studentName]: newStudentMap
      };
    });

    // 2. Merge logs (avoid duplicate ids)
    if (logs && Array.isArray(logs)) {
      setSessionLogs(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const newLogs = logs.filter(l => !existingIds.has(l.id));
        return [...newLogs, ...prev];
      });
    }

    return true;
  };

  // Overwrite entire database (Backup import)
  const importFullBackup = (backup) => {
    if (backup.vocabulary) setVocabulary(backup.vocabulary);
    if (backup.students) setStudents(backup.students);
    if (backup.assignments) setAssignments(backup.assignments);
    if (backup.studentProgress) setStudentProgress(backup.studentProgress);
    if (backup.sessionLogs) setSessionLogs(backup.sessionLogs);
  };

  return (
    <AppContext.Provider value={{
      vocabulary,
      students,
      currentUser,
      sessionLogs,
      studentProgress,
      assignments,
      loginUser,
      logoutUser,
      updateProgress,
      resetStudentProgress,
      addOrUpdateStudent,
      deleteStudent,
      setStudents,
      setAssignments,
      updateVocabularyWord,
      deleteVocabularyWord,
      addVocabularyWord,
      clearAllLogs,
      importFullBackup,
      mergeStudentProgress,
      onlineUsers,
      isExerciseActive,
      setIsExerciseActive,
      sessionExerciseTime
    }}>
      {children}
    </AppContext.Provider>
  );
};
