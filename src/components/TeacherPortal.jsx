import React, { useState, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useViewport } from '../hooks/useViewport';
import StudentDetailView from './StudentDetailView';

export default function TeacherPortal() {
  const { 
    students, 
    vocabulary, 
    studentProgress, 
    assignments, 
    sessionLogs,
    addOrUpdateStudent, 
    deleteStudent, 
    setStudents,
    setAssignments,
    resetStudentProgress, 
    logoutUser,
    mergeStudentProgress
  } = useContext(AppContext);

  const { isMobile, isTablet } = useViewport();
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'assignments' | 'gradebook' | 'vocab'
  
  const AVAILABLE_CLASSES = ['1A', '2A', '2B', '3A', '4A', '4B', '5A', '5B', '6A'];

  // Student form state
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('1A');
  const [csvText, setCsvText] = useState('');
  const [csvClass, setCsvClass] = useState('1A');
  
  // Assignment form state
  const [assignTitle, setAssignTitle] = useState('');
  const [assignGrade, setAssignGrade] = useState(4);
  const [assignUnit, setAssignUnit] = useState(1);
  const [assignLesson, setAssignLesson] = useState(1);

  // Vocabulary viewer state
  const [filterGrade, setFilterGrade] = useState(4);
  const [filterUnit, setFilterUnit] = useState(1);
  const [filterLesson, setFilterLesson] = useState(1);

  // Gradebook filters
  const [gbGrade, setGbGrade] = useState(4);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // 1. Add single student
  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const newStudent = {
      id: Date.now().toString(),
      name: newStudentName.trim(),
      grade: parseInt(newStudentClass),
      class: newStudentClass
    };
    addOrUpdateStudent(newStudent);
    setNewStudentName('');
  };

  // 2. Add roster via CSV text box (touch/desktop friendly)
  const handleCsvUpload = (e) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    
    // Parse CSV lines
    const lines = csvText.split('\n');
    const newStudentsList = [];
    
    lines.forEach((line) => {
      const cleanLine = line.replace('\r', '').trim();
      if (!cleanLine || cleanLine.toLowerCase() === 'name') return;
      
      newStudentsList.push({
        id: (Date.now() + Math.random()).toString(),
        name: cleanLine,
        grade: parseInt(csvClass),
        class: csvClass
      });
    });

    setStudents(prev => [...prev, ...newStudentsList]);
    setCsvText('');
    alert(`Successfully imported ${newStudentsList.length} students!`);
  };

  // 3. Export Roster to CSV
  const exportRosterCsv = () => {
    const header = "Name,Grade\n";
    const rows = students.map(s => `"${s.name}",${s.grade}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_roster.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Create new Assignment
  const handleAddAssignment = (e) => {
    e.preventDefault();
    if (!assignTitle.trim()) return;
    const newAssign = {
      id: Date.now().toString(),
      title: assignTitle.trim(),
      grade: Number(assignGrade),
      unit: Number(assignUnit),
      lesson: Number(assignLesson),
      active: true
    };
    setAssignments(prev => [newAssign, ...prev]);
    setAssignTitle('');
  };

  // 5. Delete Assignment
  const handleDeleteAssignment = (id) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  // 6. Export Gradebook Matrix to CSV
  const exportGradebookCsv = () => {
    const gbStudents = students.filter(s => Number(s.grade) === Number(gbGrade));
    const header = "Name,Grade,Total Stars,Words Mastered,Spelling Accuracy,Hard Words Count\n";
    
    const rows = gbStudents.map(student => {
      const prog = studentProgress[student.name] || {};
      const totalStars = Object.values(prog).reduce((sum, item) => sum + (item.score || 0), 0);
      const mastered = Object.values(prog).filter(item => item.correct).length;
      
      // Calculate spelling accuracy
      const totalAttempts = Object.values(prog).reduce((sum, item) => sum + (item.attempts || 0), 0);
      const correctAttempts = Object.values(prog).filter(item => item.correct).length;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
      
      const hardWords = Object.keys(prog).filter(wordId => prog[wordId].wrongCount >= 2).length;
      
      return `"${student.name}",${student.grade},${totalStars},${mastered},${accuracy}%,${hardWords}`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `grade_${gbGrade}_gradebook.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 7. Import and merge individual student progress
  const handleMergeProgressUpload = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.studentName || !parsed.progress) {
          alert("Invalid progress file format. Please make sure this is a student progress JSON file.");
          return;
        }
        
        const success = mergeStudentProgress(parsed);
        if (success) {
          alert(`Successfully merged progress for student: ${parsed.studentName}!`);
        } else {
          alert("Failed to merge student progress data.");
        }
      } catch (err) {
        alert("Invalid file format. Make sure it is a valid JSON file.");
      }
    };
    fileReader.readAsText(file);
    e.target.value = null;
  };

  // Group filtered vocabulary words
  const filteredWords = vocabulary.filter(w => 
    Number(w.grade) === Number(filterGrade) &&
    Number(w.unit) === Number(filterUnit) &&
    Number(w.lesson) === Number(filterLesson)
  );

  if (selectedStudent) {
    return (
      <StudentDetailView
        student={selectedStudent}
        studentProgress={studentProgress}
        sessionLogs={sessionLogs}
        vocabulary={vocabulary}
        onBack={() => setSelectedStudent(null)}
        resetStudentProgress={resetStudentProgress}
      />
    );
  }

  return (
    <div className={`teacher-dashboard ${isMobile || isTablet ? 'viewport-lock' : ''}`}>
      {/* Top Header */}
      <header className="teacher-header animate-slide-down">
        <div className="header-left">
          <h1>Welcome, Teacher! 👩‍🏫</h1>
          <p className="portal-sub">Class Management & Assignment Board</p>
        </div>
        <button 
          type="button" 
          className="logout-btn"
          onClick={logoutUser}
        >
          Sign Out 🚪
        </button>
      </header>

      {/* Nav Tabs */}
      {!isMobile && (
        <nav className="teacher-tabs container">
          <button 
            type="button" 
            className={`teacher-tab ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            📁 Class Roster
          </button>
          <button 
            type="button" 
            className={`teacher-tab ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            📝 Assignments
          </button>
          <button 
            type="button" 
            className={`teacher-tab ${activeTab === 'gradebook' ? 'active' : ''}`}
            onClick={() => setActiveTab('gradebook')}
          >
            🏆 Gradebook & Scores
          </button>
          <button 
            type="button" 
            className={`teacher-tab ${activeTab === 'vocab' ? 'active' : ''}`}
            onClick={() => setActiveTab('vocab')}
          >
            📘 Vocabulary List
          </button>
        </nav>
      )}

      {/* Main Content Pane */}
      <main className={`teacher-content container ${isMobile || isTablet ? 'scrollable-content' : ''} ${isMobile ? 'has-mobile-bottom-nav' : ''}`}>
        {activeTab === 'roster' && (
          <div className="tab-pane roster-pane animate-fade-in">
            <div className="teacher-grid-split">
              {/* Left: Add Student forms */}
              <div className="form-card-container">
                <div className="dashboard-card">
                  <h3>Add Single Student</h3>
                  <form onSubmit={handleAddStudent} className="dashboard-form">
                    <div className="form-group">
                      <label htmlFor="student-name">Student Full Name</label>
                      <input 
                        id="student-name"
                        type="text" 
                        placeholder="e.g. Somchai Dee" 
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Class Section</label>
                      <select 
                        value={newStudentClass} 
                        onChange={(e) => setNewStudentClass(e.target.value)} 
                        className="form-select"
                      >
                        {AVAILABLE_CLASSES.map(c => (
                          <option key={c} value={c}>Class {c}</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="action-btn-primary">Add Student 👤</button>
                  </form>
                </div>

                <div className="dashboard-card">
                  <h3>Bulk Upload Class List</h3>
                  <p className="card-hint-text">Paste names list below (one name per line):</p>
                  <form onSubmit={handleCsvUpload} className="dashboard-form">
                    <div className="form-group">
                      <textarea
                        rows="6"
                        placeholder="Somchai&#10;Somsak&#10;Anong"
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        className="form-textarea"
                        required
                      ></textarea>
                    </div>
                    <div className="form-group">
                      <label>Class Section for Upload</label>
                      <select 
                        value={csvClass} 
                        onChange={(e) => setCsvClass(e.target.value)} 
                        className="form-select"
                      >
                        {AVAILABLE_CLASSES.map(c => (
                          <option key={c} value={c}>Class {c}</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="action-btn-primary">Import Names 📥</button>
                  </form>
                </div>
              </div>

              {/* Right: Active roster list */}
              <div className="table-card">
                <div className="table-header-row">
                  <h3>Current Student Roster ({students.length})</h3>
                  <button 
                    type="button" 
                    className="action-btn-secondary"
                    onClick={exportRosterCsv}
                  >
                    💾 Export CSV
                  </button>
                </div>
                <div className="table-wrapper">
                  {isMobile ? (
                    <div className="mobile-cards-list">
                      {students.map(s => (
                        <div key={s.id} className="mobile-card">
                          <div className="mobile-card-header">
                            <span>{s.name}</span>
                            <span className="badge">Class {s.class || `${s.grade}A`}</span>
                          </div>
                          <div className="mobile-card-actions">
                            <button 
                              type="button"
                              className="delete-item-btn"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ${s.name}?`)) {
                                  deleteStudent(s.id);
                                }
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {students.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                          No students added yet. Upload or add some names above.
                        </div>
                      )}
                    </div>
                  ) : (
                    <table className="roster-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Grade</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(s => (
                          <tr key={s.id}>
                            <td><strong>{s.name}</strong></td>
                            <td><span className="badge">Class {s.class || `${s.grade}A`}</span></td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                type="button"
                                className="delete-item-btn"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete ${s.name}?`)) {
                                    deleteStudent(s.id);
                                  }
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {students.length === 0 && (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                              No students added yet. Upload or add some names above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="tab-pane assignments-pane animate-fade-in">
            <div className="teacher-grid-split">
              {/* Left: Create Assignment */}
              <div className="form-card-container">
                <div className="dashboard-card">
                  <h3>Create New Assignment</h3>
                  <form onSubmit={handleAddAssignment} className="dashboard-form">
                    <div className="form-group">
                      <label htmlFor="assign-title">Assignment Title</label>
                      <input 
                        id="assign-title"
                        type="text" 
                        placeholder="e.g. Lesson 1 Spelling Prep" 
                        value={assignTitle}
                        onChange={(e) => setAssignTitle(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Grade Level</label>
                      <select 
                        value={assignGrade} 
                        onChange={(e) => setAssignGrade(Number(e.target.value))} 
                        className="form-select"
                      >
                        {[1, 2, 3, 4, 5, 6].map(g => (
                          <option key={g} value={g}>Grade {g}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group-row">
                      <div className="form-group">
                        <label>Unit</label>
                        <select 
                          value={assignUnit} 
                          onChange={(e) => setAssignUnit(Number(e.target.value))}
                          className="form-select"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(u => (
                            <option key={u} value={u}>Unit {u}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Lesson</label>
                        <select 
                          value={assignLesson} 
                          onChange={(e) => setAssignLesson(Number(e.target.value))}
                          className="form-select"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                            <option key={l} value={l}>Lesson {l}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="action-btn-primary">Assign Lesson 📢</button>
                  </form>
                </div>
              </div>

              {/* Right: Active assignments list */}
              <div className="table-card">
                <h3>Active Lessons Assignments</h3>
                <div className="table-wrapper">
                  {isMobile ? (
                    <div className="mobile-cards-list">
                      {assignments.map(a => (
                        <div key={a.id} className="mobile-card">
                          <div className="mobile-card-header">
                            <span>{a.title}</span>
                            <span className="badge">Grade {a.grade}</span>
                          </div>
                          <div className="mobile-card-body">
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">Scope:</span>
                              <span className="mobile-card-value">Unit {a.unit} - Lesson {a.lesson}</span>
                            </div>
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">Status:</span>
                              <span className="mobile-card-value" style={{ color: 'var(--success)' }}>🟢 Active</span>
                            </div>
                          </div>
                          <div className="mobile-card-actions">
                            <button 
                              type="button"
                              className="delete-item-btn"
                              onClick={() => handleDeleteAssignment(a.id)}
                            >
                              🗑️ Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      {assignments.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                          No active assignments.
                        </div>
                      )}
                    </div>
                  ) : (
                    <table className="assignments-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Grade</th>
                          <th>Lesson Scope</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map(a => (
                          <tr key={a.id}>
                            <td><strong>{a.title}</strong></td>
                            <td><span className="badge">Grade {a.grade}</span></td>
                            <td>Unit {a.unit} - Lesson {a.lesson}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="status-badge-active">🟢 Active</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                type="button"
                                className="delete-item-btn"
                                onClick={() => handleDeleteAssignment(a.id)}
                              >
                                🗑️ Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                        {assignments.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                              No active assignments.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gradebook' && (
          <div className="tab-pane gradebook-pane animate-fade-in">
            <div className="table-card">
              <div className="table-header-row responsive-stack">
                <div className="header-filters">
                  <h3>Student Progress Matrix</h3>
                  <div className="grade-selector-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {[1, 2, 3, 4, 5, 6].map(g => (
                      <button
                        key={g}
                        type="button"
                        className={`grade-pill ${gbGrade === g ? 'active' : ''}`}
                        onClick={() => setGbGrade(g)}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                      >
                        Grade {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <label 
                    className="action-btn-secondary" 
                    style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}
                  >
                    📥 Merge Pupil Progress
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleMergeProgressUpload} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                  <button 
                    type="button" 
                    className="action-btn-secondary"
                    onClick={exportGradebookCsv}
                  >
                    💾 Export Gradebook Report
                  </button>
                </div>
              </div>

              <div className="table-wrapper">
                {isMobile ? (
                  <div className="mobile-cards-list">
                    {students.filter(s => Number(s.grade) === gbGrade).map(student => {
                      const prog = studentProgress[student.name] || {};
                      const totalStars = Object.values(prog).reduce((sum, item) => sum + (item.score || 0), 0);
                      const mastered = Object.values(prog).filter(item => item.correct).length;
                      
                      // Calculate spelling accuracy
                      const totalAttempts = Object.values(prog).reduce((sum, item) => sum + (item.attempts || 0), 0);
                      const correctAttempts = Object.values(prog).filter(item => item.correct).length;
                      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
                      
                      // Flag hard words (failed spelling >= 2 times)
                      const hardWordIds = Object.keys(prog).filter(wordId => prog[wordId].wrongCount >= 2);
                      const hardWordList = hardWordIds.map(wId => {
                        const vocabItem = vocabulary.find(v => String(v.id) === String(wId));
                        return vocabItem ? vocabItem.word : '';
                      }).filter(Boolean);

                      return (
                        <div key={student.id} className="mobile-card">
                          <div className="mobile-card-header">
                            <a 
                              href="#"
                              onClick={(e) => { e.preventDefault(); setSelectedStudent(student); }}
                              style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}
                            >
                              {student.name}
                            </a>
                            <span className="badge">Class {student.class || `${student.grade}A`}</span>
                          </div>
                          <div className="mobile-card-body">
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">Total Stars:</span>
                              <span className="mobile-card-value">⭐ {totalStars}</span>
                            </div>
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">Words Mastered:</span>
                              <span className="mobile-card-value">{mastered} words</span>
                            </div>
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">Spelling Accuracy:</span>
                              <div className="accuracy-pill" style={{ 
                                backgroundColor: accuracy > 80 ? '#d4edda' : accuracy > 50 ? '#fff3cd' : '#f8d7da',
                                color: accuracy > 80 ? '#155724' : accuracy > 50 ? '#856404' : '#721c24',
                                fontSize: '0.85rem',
                                padding: '0.15rem 0.5rem'
                              }}>
                                {accuracy}%
                              </div>
                            </div>
                            <div className="mobile-card-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                              <span className="mobile-card-label">Difficult Words:</span>
                              <div style={{ marginTop: '4px' }}>
                                {hardWordList.length > 0 ? (
                                  <span className="hard-words-flags">
                                    {hardWordList.map(w => (
                                      <span key={w} className="hard-word-badge" style={{ margin: '2px' }}>
                                        {w} ({prog[vocabulary.find(v => v.word === w).id].wrongCount}x)
                                      </span>
                                    ))}
                                  </span>
                                ) : (
                                  <span style={{ color: '#28a745', fontSize: '0.9rem' }}>🟢 None</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mobile-card-actions">
                            <button
                              type="button"
                              className="action-btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', marginRight: '0.5rem', backgroundColor: 'var(--primary)' }}
                              onClick={() => setSelectedStudent(student)}
                            >
                              📊 View Report
                            </button>
                            <button 
                              type="button"
                              className="reset-progress-btn"
                              onClick={() => {
                                if (window.confirm(`Reset progress data for ${student.name}?`)) {
                                  resetStudentProgress(student.name);
                                }
                              }}
                            >
                              🔄 Reset
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {students.filter(s => Number(s.grade) === gbGrade).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                        No students in Grade {gbGrade} yet.
                      </div>
                    )}
                  </div>
                ) : (
                  <table className="gradebook-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th style={{ textAlign: 'center' }}>Total Stars</th>
                        <th style={{ textAlign: 'center' }}>Words Mastered</th>
                        <th style={{ textAlign: 'center' }}>Spelling Accuracy</th>
                        <th>Difficult Words Flagged</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.filter(s => Number(s.grade) === gbGrade).map(student => {
                        const prog = studentProgress[student.name] || {};
                        const totalStars = Object.values(prog).reduce((sum, item) => sum + (item.score || 0), 0);
                        const mastered = Object.values(prog).filter(item => item.correct).length;
                        
                        // Calculate spelling accuracy
                        const totalAttempts = Object.values(prog).reduce((sum, item) => sum + (item.attempts || 0), 0);
                        const correctAttempts = Object.values(prog).filter(item => item.correct).length;
                        const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
                        
                        // Flag hard words (failed spelling >= 2 times)
                        const hardWordIds = Object.keys(prog).filter(wordId => prog[wordId].wrongCount >= 2);
                        const hardWordList = hardWordIds.map(wId => {
                          const vocabItem = vocabulary.find(v => String(v.id) === String(wId));
                          return vocabItem ? vocabItem.word : '';
                        }).filter(Boolean);

                        return (
                           <tr key={student.id}>
                             <td>
                               <a 
                                 href="#"
                                 onClick={(e) => { e.preventDefault(); setSelectedStudent(student); }}
                                 style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}
                               >
                                 {student.name}
                               </a>
                               &nbsp;
                               <small style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({student.class || `${student.grade}A`})</small>
                             </td>
                            <td style={{ textAlign: 'center' }}>⭐ {totalStars}</td>
                            <td style={{ textAlign: 'center' }}>{mastered} words</td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="accuracy-pill" style={{ 
                                backgroundColor: accuracy > 80 ? '#d4edda' : accuracy > 50 ? '#fff3cd' : '#f8d7da',
                                color: accuracy > 80 ? '#155724' : accuracy > 50 ? '#856404' : '#721c24'
                              }}>
                                {accuracy}%
                              </div>
                            </td>
                            <td>
                              {hardWordList.length > 0 ? (
                                <span className="hard-words-flags">
                                  {hardWordList.map(w => (
                                    <span key={w} className="hard-word-badge">{w} ({prog[vocabulary.find(v => v.word === w).id].wrongCount}x)</span>
                                  ))}
                                </span>
                              ) : (
                                <span style={{ color: '#28a745' }}>🟢 None</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="action-btn-primary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', marginRight: '0.5rem', backgroundColor: 'var(--primary)' }}
                                onClick={() => setSelectedStudent(student)}
                              >
                                📊 Report
                              </button>
                              <button 
                                type="button"
                                className="reset-progress-btn"
                                onClick={() => {
                                  if (window.confirm(`Reset progress data for ${student.name}?`)) {
                                    resetStudentProgress(student.name);
                                  }
                                }}
                              >
                                🔄 Reset
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {students.filter(s => Number(s.grade) === gbGrade).length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                            No students in Grade {gbGrade} yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vocab' && (
          <div className="tab-pane vocab-pane animate-fade-in">
            <div className="table-card">
              <div className="filters-row responsive-stack">
                <h3>Vocabulary Explorer</h3>
                <div className="vocab-filters-group">
                  <div className="filter-item">
                    <label>Grade</label>
                    <select 
                      value={filterGrade} 
                      onChange={(e) => setFilterGrade(Number(e.target.value))}
                      className="form-select"
                    >
                      {[1, 2, 3, 4, 5, 6].map(g => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-item">
                    <label>Unit</label>
                    <select 
                      value={filterUnit} 
                      onChange={(e) => setFilterUnit(Number(e.target.value))}
                      className="form-select"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(u => (
                        <option key={u} value={u}>Unit {u}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-item">
                    <label>Lesson</label>
                    <select 
                      value={filterLesson} 
                      onChange={(e) => setFilterLesson(Number(e.target.value))}
                      className="form-select"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                        <option key={l} value={l}>Lesson {l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="vocab-cards-grid animate-scale-up">
                {filteredWords.map(wordItem => (
                  <div key={wordItem.id} className="vocab-word-card">
                    <div className="card-img-wrapper">
                      <img 
                        src={wordItem.image} 
                        alt={wordItem.word}
                        onError={(e) => { e.target.src = '/images/design/dragon_mascot.png'; }}
                      />
                    </div>
                    <div className="card-vocab-body">
                      <h4>{wordItem.word}</h4>
                      <p className="thai-trans-vocab">{wordItem.thai || '(No Translation)'}</p>
                      {wordItem.definition && (
                        <p className="definition-vocab"><strong>Def:</strong> {wordItem.definition}</p>
                      )}
                      {wordItem.example && (
                        <p className="example-vocab"><em>"{wordItem.example}"</em></p>
                      )}
                    </div>
                  </div>
                ))}
                {filteredWords.length === 0 && (
                  <div style={{ colSpan: '4', textAlign: 'center', width: '100%', padding: '3rem', color: '#999' }}>
                    No words found for Grade {filterGrade} Unit {filterUnit} Lesson {filterLesson}.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {isMobile && (
        <div className="mobile-bottom-nav">
          <button 
            type="button" 
            className={`mobile-bottom-nav-btn ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            <span className="mobile-bottom-nav-icon">📁</span>
            <span>Roster</span>
          </button>
          <button 
            type="button" 
            className={`mobile-bottom-nav-btn ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            <span className="mobile-bottom-nav-icon">📝</span>
            <span>Assigns</span>
          </button>
          <button 
            type="button" 
            className={`mobile-bottom-nav-btn ${activeTab === 'gradebook' ? 'active' : ''}`}
            onClick={() => setActiveTab('gradebook')}
          >
            <span className="mobile-bottom-nav-icon">🏆</span>
            <span>Grades</span>
          </button>
          <button 
            type="button" 
            className={`mobile-bottom-nav-btn ${activeTab === 'vocab' ? 'active' : ''}`}
            onClick={() => setActiveTab('vocab')}
          >
            <span className="mobile-bottom-nav-icon">📘</span>
            <span>Vocab</span>
          </button>
        </div>
      )}
    </div>
  );
}
