import React, { useState, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useViewport } from '../hooks/useViewport';
import StudentDetailView from './StudentDetailView';

export default function AdminPortal() {
  const { 
    vocabulary, 
    students, 
    sessionLogs, 
    studentProgress, 
    assignments, 
    updateVocabularyWord, 
    deleteVocabularyWord, 
    addVocabularyWord, 
    importFullBackup,
    logoutUser,
    onlineUsers,
    resetStudentProgress,
    mergeStudentProgress,
    clearAllLogs
  } = useContext(AppContext);

  const { isMobile, isTablet } = useViewport();
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'vocab' | 'backup' | 'progress'
  const [gbGrade, setGbGrade] = useState(4);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Word editor states
  const [editingWordId, setEditingWordId] = useState(null);
  const [wordForm, setWordForm] = useState({
    word: '',
    thai: '',
    grade: 4,
    unit: 1,
    lesson: 1,
    image: '',
    definition: '',
    example: ''
  });
  
  // Filter for admin vocabulary editor
  const [filterGrade, setFilterGrade] = useState(4);
  const [filterUnit, setFilterUnit] = useState(1);
  const [filterLesson, setFilterLesson] = useState(1);

  // Pagination for logs
  const [logPage, setLogPage] = useState(1);
  const [logDateFilter, setLogDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK'
  const logsPerPage = 15;

  const filteredLogs = sessionLogs.filter(log => {
    const logDate = new Date(log.timestamp);
    const today = new Date();
    
    if (logDateFilter === 'TODAY') {
      return logDate.toDateString() === today.toDateString();
    }
    if (logDateFilter === 'YESTERDAY') {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      return logDate.toDateString() === yesterday.toDateString();
    }
    if (logDateFilter === 'WEEK') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(today.getDate() - 7);
      return logDate >= oneWeekAgo;
    }
    return true;
  });

  const totalLogPages = Math.ceil(filteredLogs.length / logsPerPage);
  const displayedLogs = filteredLogs.slice((logPage - 1) * logsPerPage, logPage * logsPerPage);



  const handleEditClick = (wordItem) => {
    setEditingWordId(wordItem.id);
    setWordForm({
      word: wordItem.word,
      thai: wordItem.thai || '',
      grade: wordItem.grade,
      unit: wordItem.unit,
      lesson: wordItem.lesson,
      image: wordItem.image || '',
      definition: wordItem.definition || '',
      example: wordItem.example || ''
    });
  };

  const handleSaveWord = (e) => {
    e.preventDefault();
    if (!wordForm.word.trim()) return;

    if (editingWordId === 'new') {
      const newWord = {
        id: Date.now(), // Generate numerical ID
        ...wordForm,
        word: wordForm.word.trim()
      };
      addVocabularyWord(newWord);
    } else {
      const updatedWord = {
        id: editingWordId,
        ...wordForm,
        word: wordForm.word.trim()
      };
      updateVocabularyWord(updatedWord);
    }
    setEditingWordId(null);
  };

  const handleNewWordClick = () => {
    setEditingWordId('new');
    setWordForm({
      word: '',
      thai: '',
      grade: filterGrade,
      unit: filterUnit,
      lesson: filterLesson,
      image: `/images/flashcards/lets_shine_${filterGrade}/U${filterUnit}_L${filterLesson}_new.png`,
      definition: '',
      example: ''
    });
  };

  // Backup & Restore
  const handleBackupExport = () => {
    const dataStr = JSON.stringify({
      vocabulary,
      students,
      assignments,
      studentProgress,
      sessionLogs
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `little_spellers_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackupImport = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (window.confirm("This will overwrite all current student progress, class rosters, logs, and vocabulary. Proceed?")) {
          importFullBackup(parsed);
          alert("Backup restored successfully!");
        }
      } catch (err) {
        alert("Invalid backup file format.");
      }
    };
    fileReader.readAsText(file);
  };

  const handleClearAllData = () => {
    if (window.confirm("🚨 CRITICAL ACTION: Are you sure you want to clear ALL custom databases and reset to defaults? This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleMergeProgressUpload = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        mergeStudentProgress(parsed);
        alert("Progress data merged successfully!");
      } catch (err) {
        alert("Invalid file format. Make sure it is a valid JSON file.");
      }
    };
    fileReader.readAsText(file);
  };

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
    <div className={`admin-dashboard ${isMobile || isTablet ? 'viewport-lock' : ''}`}>
      {/* Top Header */}
      <header className="admin-header animate-slide-down">
        <div className="header-left">
          <h1>System Control Panel 🛡️</h1>
          <p className="portal-sub">Super Administrator dashboard & system configuration</p>
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
            className={`teacher-tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            📈 User Session Logger
          </button>
          <button 
            type="button" 
            className={`teacher-tab ${activeTab === 'vocab' ? 'active' : ''}`}
            onClick={() => setActiveTab('vocab')}
          >
            🔧 Vocabulary database
          </button>
          <button 
            type="button" 
            className={`teacher-tab ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            📊 Student Progress
          </button>
          <button 
            type="button" 
            className={`teacher-tab ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
          >
            💾 Database Backup & Config
          </button>
        </nav>
      )}

      {/* Main Grid content */}
      <main className={`teacher-content container ${isMobile || isTablet ? 'scrollable-content' : ''} ${isMobile ? 'has-mobile-bottom-nav' : ''}`}>
        {activeTab === 'logs' && (
          <div className="tab-pane logs-pane animate-fade-in">
            {/* Live activity stats card */}
            <div className="admin-stats-cards">
              <div className="admin-stat-card bg-primary">
                <h3>Active Logins</h3>
                <span className="stat-value">{onlineUsers.length}</span>
                <p>Currently active student/teacher sessions</p>
              </div>
              <div className="admin-stat-card bg-secondary">
                <h3>Total Logins Logged</h3>
                <span className="stat-value">{sessionLogs.length}</span>
                <p>Total historical user logs</p>
              </div>
            </div>

            {/* Currently Online Users Panel */}
            <div className="table-card mt-4" style={{ borderLeft: '4px solid var(--success)' }}>
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <span className="live-dot" style={{
                    width: '10px',
                    height: '10px',
                    backgroundColor: 'var(--success)',
                    borderRadius: '50%',
                    display: 'inline-block',
                    boxShadow: '0 0 8px var(--success)'
                  }}></span>
                  Currently Online Users ({onlineUsers.length})
                </h3>
              </div>
              
              <div className="table-wrapper">
                {onlineUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    💤 No users online at the moment.
                  </div>
                ) : isMobile ? (
                  <div className="mobile-cards-list">
                    {onlineUsers.map(user => {
                      const studentMap = studentProgress[user.name] || {};
                      const cumulativeSec = studentMap._totalExerciseTime || 0;
                      
                      const formatTime = (totalSeconds) => {
                        if (!totalSeconds || totalSeconds < 0) return '0s';
                        const m = Math.floor(totalSeconds / 60);
                        const s = totalSeconds % 60;
                        return m > 0 ? `${m}m ${s}s` : `${s}s`;
                      };

                      const deviceIcon = user.device === 'Mobile' ? '📱' : user.device === 'Tablet' ? '📟' : '🖥️';

                      return (
                        <div key={user.name} className="mobile-card" style={{ borderLeft: user.isExerciseActive ? '4px solid var(--primary)' : 'none' }}>
                          <div className="mobile-card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className="online-indicator" style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: 'var(--success)',
                                borderRadius: '50%'
                              }}></span>
                              <strong>{user.name}</strong>
                            </div>
                            <span className={`badge ${user.role === 'admin' ? 'admin-badge' : user.role === 'teacher' ? 'teacher-badge' : ''}`}>
                              {user.role.toUpperCase()} {user.grade && user.grade !== 'N/A' ? `(Grade ${user.grade})` : ''}
                            </span>
                          </div>
                          <div className="mobile-card-body">
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">Device:</span>
                              <span className="mobile-card-value">{deviceIcon} {user.device}</span>
                            </div>
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">Time Online:</span>
                              <span className="mobile-card-value">⏱️ {formatTime(user.sessionTime)}</span>
                            </div>
                            {user.role === 'student' && (
                              <div className="mobile-card-row">
                                <span className="mobile-card-label">Exercise Time:</span>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                  <span>🏃‍♂️ {formatTime(user.exerciseTime)} (Session)</span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📚 Total: {formatTime(cumulativeSec)}</span>
                                </div>
                              </div>
                            )}
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">Status:</span>
                              {user.role === 'student' ? (
                                <span className="badge" style={{
                                  backgroundColor: user.isExerciseActive ? 'var(--success-light)' : 'var(--border-color)',
                                  color: user.isExerciseActive ? 'var(--success)' : 'var(--text-muted)',
                                  padding: '0.15rem 0.5rem'
                                }}>
                                  {user.isExerciseActive ? '✏️ Doing Exercises' : '💤 Idle (Menu)'}
                                </span>
                              ) : (
                                <span className="badge idle-badge" style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-muted)', padding: '0.15rem 0.5rem' }}>
                                  🛡️ Monitoring
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role / Grade</th>
                        <th>Device</th>
                        <th>Time Online</th>
                        <th>Exercise Time</th>
                        <th>Current Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onlineUsers.map(user => {
                        const studentMap = studentProgress[user.name] || {};
                        const cumulativeSec = studentMap._totalExerciseTime || 0;
                        
                        const formatTime = (totalSeconds) => {
                          if (!totalSeconds || totalSeconds < 0) return '0s';
                          const m = Math.floor(totalSeconds / 60);
                          const s = totalSeconds % 60;
                          return m > 0 ? `${m}m ${s}s` : `${s}s`;
                        };

                        const deviceIcon = user.device === 'Mobile' ? '📱' : user.device === 'Tablet' ? '📟' : '🖥️';
                        
                        return (
                          <tr key={user.name} style={{ borderLeft: user.isExerciseActive ? '3px solid var(--primary)' : 'none' }}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="online-indicator" style={{
                                  width: '8px',
                                  height: '8px',
                                  backgroundColor: 'var(--success)',
                                  borderRadius: '50%'
                                }}></span>
                                <strong>{user.name}</strong>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${user.role === 'admin' ? 'admin-badge' : user.role === 'teacher' ? 'teacher-badge' : ''}`}>
                                {user.role.toUpperCase()} {user.grade && user.grade !== 'N/A' ? `(Grade ${user.grade})` : ''}
                              </span>
                            </td>
                            <td>{deviceIcon} {user.device}</td>
                            <td>⏱️ {formatTime(user.sessionTime)}</td>
                            <td>
                              {user.role === 'student' ? (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span>🏃‍♂️ {formatTime(user.exerciseTime)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Session)</span></span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📚 Total: {formatTime(cumulativeSec)}</span>
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td>
                              {user.role === 'student' ? (
                                <span className="badge" style={{
                                  backgroundColor: user.isExerciseActive ? 'var(--success-light)' : 'var(--border-color)',
                                  color: user.isExerciseActive ? 'var(--success)' : 'var(--text-muted)'
                                }}>
                                  {user.isExerciseActive ? '✏️ Doing Exercises' : '💤 Idle (Menu)'}
                                </span>
                              ) : (
                                <span className="badge idle-badge" style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                                  🛡️ Monitoring
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Historical session monitor */}
            <div className="table-card mt-4">
              <div className="table-header-row responsive-stack" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Historical Session Activity Log</h3>
                  <p className="card-hint-text" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Total: {filteredLogs.length} events
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter:</span>
                    <select
                      value={logDateFilter}
                      onChange={(e) => {
                        setLogDateFilter(e.target.value);
                        setLogPage(1);
                      }}
                      className="form-select"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', minWidth: '120px' }}
                    >
                      <option value="ALL">🗓️ All Dates</option>
                      <option value="TODAY">☀️ Today</option>
                      <option value="YESTERDAY">🌙 Yesterday</option>
                      <option value="WEEK">📅 Last 7 Days</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="delete-item-btn"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear ALL historical session logs? This cannot be undone.")) {
                        clearAllLogs();
                        setLogPage(1);
                      }
                    }}
                  >
                    🗑️ Clear Logs
                  </button>
                </div>
              </div>
              <div className="table-wrapper">
                {isMobile ? (
                  <div className="mobile-cards-list">
                    {displayedLogs.map(log => (
                      <div key={log.id} className="mobile-card">
                        <div className="mobile-card-header">
                          <span>{log.name}</span>
                          <span className={`badge ${log.role === 'admin' ? 'admin-badge' : log.role === 'teacher' ? 'teacher-badge' : ''}`}>
                            {log.role.toUpperCase()}
                          </span>
                        </div>
                        <div className="mobile-card-body">
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">Time:</span>
                            <span className="mobile-card-value" style={{ fontSize: '0.85rem' }}>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">Event:</span>
                            <span className={log.action === 'Login' ? 'log-login' : 'log-logout'}>
                              {log.action === 'Login' ? '📥 Login' : '📤 Logout'}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">Scope:</span>
                            <span className="mobile-card-value">{log.grade !== 'N/A' ? `Grade ${log.grade}` : '-'}</span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">Device:</span>
                            <span className="mobile-card-value">🖥️ {log.device}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {displayedLogs.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                        No logins tracked yet.
                      </div>
                    )}
                  </div>
                ) : (
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>User</th>
                        <th>Role</th>
                        <th>Grade</th>
                        <th>Event</th>
                        <th>Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedLogs.map(log => (
                        <tr key={log.id}>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                          <td><strong>{log.name}</strong></td>
                          <td>
                            <span className={`badge ${log.role === 'admin' ? 'admin-badge' : log.role === 'teacher' ? 'teacher-badge' : ''}`}>
                              {log.role.toUpperCase()}
                            </span>
                          </td>
                          <td>{log.grade !== 'N/A' ? `Grade ${log.grade}` : '-'}</td>
                          <td>
                            <span className={log.action === 'Login' ? 'log-login' : 'log-logout'}>
                              {log.action === 'Login' ? '📥 Login' : '📤 Logout'}
                            </span>
                          </td>
                          <td>🖥️ {log.device}</td>
                        </tr>
                      ))}
                      {displayedLogs.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                            No logins tracked yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {totalLogPages > 1 && (
                <div className="pagination-row">
                  <button 
                    type="button" 
                    onClick={() => setLogPage(p => Math.max(1, p - 1))}
                    disabled={logPage === 1}
                  >
                    ◀ Prev
                  </button>
                  <span>Page {logPage} of {totalLogPages}</span>
                  <button 
                    type="button" 
                    onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                    disabled={logPage === totalLogPages}
                  >
                    Next ▶
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'vocab' && (
          <div className="tab-pane admin-vocab-pane animate-fade-in">
            {/* Word Editor Modal/Panel */}
            {editingWordId !== null && (
              <div className="modal-overlay animate-fade-in">
                <div className="modal-card animate-scale-up">
                  <h3>{editingWordId === 'new' ? '🆕 Add Vocabulary Word' : '✏️ Edit Vocabulary Word'}</h3>
                  <form onSubmit={handleSaveWord} className="modal-form">
                    <div className="form-group-row">
                      <div className="form-group">
                        <label>English Word</label>
                        <input 
                          type="text" 
                          value={wordForm.word}
                          onChange={(e) => setWordForm({...wordForm, word: e.target.value})}
                          className="form-input"
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label>Thai Translation</label>
                        <input 
                          type="text" 
                          value={wordForm.thai}
                          onChange={(e) => setWordForm({...wordForm, thai: e.target.value})}
                          className="form-input"
                          required 
                        />
                      </div>
                    </div>

                    <div className="form-group-row">
                      <div className="form-group">
                        <label>Grade</label>
                        <select 
                          value={wordForm.grade}
                          onChange={(e) => setWordForm({...wordForm, grade: Number(e.target.value)})}
                          className="form-select"
                        >
                          {[1, 2, 3, 4, 5, 6].map(g => (
                            <option key={g} value={g}>Grade {g}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Unit</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="8" 
                          value={wordForm.unit}
                          onChange={(e) => setWordForm({...wordForm, unit: Number(e.target.value)})}
                          className="form-input" 
                        />
                      </div>
                      <div className="form-group">
                        <label>Lesson</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="8" 
                          value={wordForm.lesson}
                          onChange={(e) => setWordForm({...wordForm, lesson: Number(e.target.value)})}
                          className="form-input" 
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Image Source Relative Path</label>
                      <input 
                        type="text" 
                        value={wordForm.image}
                        onChange={(e) => setWordForm({...wordForm, image: e.target.value})}
                        className="form-input" 
                      />
                    </div>

                    <div className="form-group">
                      <label>English Definition / Context Hint</label>
                      <textarea 
                        rows="2"
                        value={wordForm.definition}
                        onChange={(e) => setWordForm({...wordForm, definition: e.target.value})}
                        className="form-textarea"
                      ></textarea>
                    </div>

                    <div className="form-group">
                      <label>Example Sentence</label>
                      <input 
                        type="text" 
                        value={wordForm.example}
                        onChange={(e) => setWordForm({...wordForm, example: e.target.value})}
                        className="form-input" 
                      />
                    </div>

                    <div className="modal-actions-row">
                      <button 
                        type="button" 
                        className="action-btn-secondary"
                        onClick={() => setEditingWordId(null)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="action-btn-primary">
                        Save Word
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* List and Filters */}
            <div className="table-card">
              <div className="filters-row responsive-stack">
                <div className="header-filters">
                  <h3>Vocabulary Database Admin</h3>
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
                <button 
                  type="button" 
                  className="action-btn-primary"
                  onClick={handleNewWordClick}
                >
                  ➕ Add New Word
                </button>
              </div>

              <div className="table-wrapper mt-3">
                {isMobile ? (
                  <div className="mobile-cards-list">
                    {filteredWords.map(wordItem => (
                      <div key={wordItem.id} className="mobile-card">
                        <div className="mobile-card-header" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <img 
                            src={wordItem.image} 
                            alt={wordItem.word} 
                            style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }}
                            onError={(e) => { e.target.src = '/images/design/dragon_mascot.png'; }}
                          />
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{wordItem.word}</h4>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Unit {wordItem.unit} - Lesson {wordItem.lesson}</span>
                          </div>
                        </div>
                        <div className="mobile-card-body">
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">Thai Translation:</span>
                            <span className="mobile-card-value">{wordItem.thai || '-'}</span>
                          </div>
                          <div className="mobile-card-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span className="mobile-card-label">Definition Clue:</span>
                            <span className="mobile-card-value" style={{ marginTop: '2px', fontSize: '0.85rem' }}>{wordItem.definition}</span>
                          </div>
                        </div>
                        <div className="mobile-card-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                          <button 
                            type="button" 
                            className="edit-item-btn"
                            onClick={() => handleEditClick(wordItem)}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            type="button" 
                            className="delete-item-btn"
                            onClick={() => {
                              if (window.confirm(`Delete "${wordItem.word}" from the database?`)) {
                                deleteVocabularyWord(wordItem.id);
                              }
                            }}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredWords.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                        No words found matching criteria. Click Add New Word to expand syllabus.
                      </div>
                    )}
                  </div>
                ) : (
                  <table className="admin-vocab-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>English Word</th>
                        <th>Thai Translation</th>
                        <th>Unit/Lesson</th>
                        <th>Definition Clue</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWords.map(wordItem => (
                        <tr key={wordItem.id}>
                          <td>
                            <img 
                              src={wordItem.image} 
                              alt={wordItem.word} 
                              style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }}
                              onError={(e) => { e.target.src = '/images/design/dragon_mascot.png'; }}
                            />
                          </td>
                          <td><strong>{wordItem.word}</strong></td>
                          <td>{wordItem.thai || '-'}</td>
                          <td>Unit {wordItem.unit} - Lesson {wordItem.lesson}</td>
                          <td><small className="line-clamp-2">{wordItem.definition}</small></td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              type="button" 
                              className="edit-item-btn mr-2"
                              onClick={() => handleEditClick(wordItem)}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              type="button" 
                              className="delete-item-btn"
                              onClick={() => {
                                if (window.confirm(`Delete "${wordItem.word}" from the database?`)) {
                                  deleteVocabularyWord(wordItem.id);
                                }
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredWords.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                            No words found matching criteria. Click Add New Word to expand syllabus.
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

        {activeTab === 'progress' && (
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
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(220, 53, 69, 0.05)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(220, 53, 69, 0.2)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--danger)' }}>⚠️ Reset Class:</span>
                    <select 
                      id="class-reset-select"
                      defaultValue=""
                      onChange={(e) => {
                        const selectedVal = e.target.value;
                        if (!selectedVal) return;
                        
                        const confirmText = selectedVal === 'ALL'
                          ? "Are you absolutely sure you want to RESET progress for ALL classes? This cannot be undone!"
                          : `Are you absolutely sure you want to RESET progress for Class ${selectedVal}? This cannot be undone!`;
                          
                        if (window.confirm(confirmText)) {
                          let count = 0;
                          students.forEach(s => {
                            const matches = selectedVal === 'ALL' || s.class === selectedVal;
                            if (matches) {
                              resetStudentProgress(s.name);
                              count++;
                            }
                          });
                          alert(`Successfully reset progress for ${count} students.`);
                          e.target.value = ""; // Reset dropdown selection
                        } else {
                          e.target.value = ""; // Reset selection on cancel
                        }
                      }}
                      style={{ 
                        padding: '0.25rem 0.5rem', 
                        fontSize: '0.8rem', 
                        borderRadius: '4px', 
                        borderColor: 'var(--danger)', 
                        cursor: 'pointer',
                        outline: 'none',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-main)'
                      }}
                    >
                      <option value="">-- Choose --</option>
                      <option value="ALL">All Classes</option>
                      {Array.from(new Set(students.map(s => s.class).filter(Boolean))).sort().map(cls => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                  </div>

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
                </div>
              </div>

              <div className="table-wrapper">
                {isMobile ? (
                  <div className="mobile-cards-list">
                    {students.filter(s => Number(s.grade) === gbGrade).map(student => {
                      const prog = studentProgress[student.name] || {};
                      const totalStars = Object.values(prog).reduce((sum, item) => sum + (item.score || 0), 0);
                      const mastered = Object.values(prog).filter(item => item.correct).length;
                      
                      const totalAttempts = Object.values(prog).reduce((sum, item) => sum + (item.attempts || 0), 0);
                      const correctAttempts = Object.values(prog).filter(item => item.correct).length;
                      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
                      
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
                        
                        const totalAttempts = Object.values(prog).reduce((sum, item) => sum + (item.attempts || 0), 0);
                        const correctAttempts = Object.values(prog).filter(item => item.correct).length;
                        const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
                        
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

        {activeTab === 'backup' && (
          <div className="tab-pane backup-pane animate-fade-in">
            <div className="grid-split-50">
              {/* Backup card */}
              <div className="dashboard-card">
                <h3>Export Database Backup</h3>
                <p>Download the entire current application state including custom student rosters, progress tracking stars, session logs, and vocabulary modifications. This JSON file can be stored on a drive or imported back anytime.</p>
                <button 
                  type="button" 
                  className="action-btn-primary mt-4 hover-glow"
                  onClick={handleBackupExport}
                >
                  📥 Download Backup (.json)
                </button>
              </div>

              {/* Restore card */}
              <div className="dashboard-card">
                <h3>Import Database Backup</h3>
                <p>Select a previously exported `.json` database file to restore it. This will replace the entire current vocabulary, class list, and scores in this browser session.</p>
                <div className="upload-btn-wrapper mt-4">
                  <input 
                    type="file" 
                    accept=".json"
                    onChange={handleBackupImport}
                    className="file-input-btn" 
                  />
                </div>
              </div>
            </div>

            {/* Critical actions reset card */}
            <div className="dashboard-card mt-4 border-danger">
              <h3 className="text-danger">🚨 Factory Reset Database</h3>
              <p>Warning: This action clears the browser local storage entirely and recovers the default lists and Grade 4/5 syllabus. All scores, custom rosters, and customized vocabulary entries will be lost forever.</p>
              <button 
                type="button" 
                className="action-btn-danger mt-3"
                onClick={handleClearAllData}
              >
                Reset Database to Factory Defaults
              </button>
            </div>
          </div>
        )}
      </main>

      {isMobile && (
        <div className="mobile-bottom-nav">
          <button 
            type="button" 
            className={`mobile-bottom-nav-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <span className="mobile-bottom-nav-icon">📈</span>
            <span>Logger</span>
          </button>
          <button 
            type="button" 
            className={`mobile-bottom-nav-btn ${activeTab === 'vocab' ? 'active' : ''}`}
            onClick={() => setActiveTab('vocab')}
          >
            <span className="mobile-bottom-nav-icon">🔧</span>
            <span>Vocab DB</span>
          </button>
          <button 
            type="button" 
            className={`mobile-bottom-nav-btn ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            <span className="mobile-bottom-nav-icon">📊</span>
            <span>Progress</span>
          </button>
          <button 
            type="button" 
            className={`mobile-bottom-nav-btn ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
          >
            <span className="mobile-bottom-nav-icon">💾</span>
            <span>Config</span>
          </button>
        </div>
      )}
    </div>
  );
}
