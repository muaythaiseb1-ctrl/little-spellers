import React, { useState } from 'react';

export default function StudentDetailView({ student, studentProgress, sessionLogs, vocabulary, onBack, resetStudentProgress }) {
  const [unitFilter, setUnitFilter] = useState('ALL');
  const [lessonFilter, setLessonFilter] = useState('ALL');

  const studentName = student.name;
  const prog = studentProgress[studentName] || {};
  const totalStars = Object.values(prog).reduce((sum, item) => sum + (item.score || 0), 0);
  const masteredCount = Object.values(prog).filter(item => item.correct).length;
  
  // Calculate spelling accuracy
  const totalAttempts = Object.values(prog).reduce((sum, item) => sum + (item.attempts || 0), 0);
  const correctAttempts = Object.values(prog).filter(item => item.correct).length;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const totalTime = prog._totalExerciseTime || 0;

  // Format exercise time
  const formatTime = (totalSeconds) => {
    if (!totalSeconds || totalSeconds < 0) return '0s';
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Filter session logs for this student
  const studentLogs = (sessionLogs || []).filter(log => log.name === studentName);

  // Filter vocab items based on dropdown selectors
  const displayedVocab = vocabulary.filter(w => {
    if (Number(w.grade) !== Number(student.grade)) return false;
    if (unitFilter !== 'ALL' && Number(w.unit) !== Number(unitFilter)) return false;
    if (lessonFilter !== 'ALL' && Number(w.lesson) !== Number(lessonFilter)) return false;
    return true;
  });

  return (
    <div className="student-detail-mode animate-fade-in container">
      {/* Header action bar */}
      <div className="detail-action-bar">
        <button type="button" className="action-btn-secondary back-btn-detailed" onClick={onBack}>
          ⬅ Back to Roster List
        </button>
        <div className="action-right">
          <button 
            type="button" 
            className="reset-progress-btn"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            onClick={() => {
              if (window.confirm(`🚨 RESET WORK WARNING: Are you sure you want to clear ALL metrics, stars, and times for ${studentName}?`)) {
                resetStudentProgress(studentName);
              }
            }}
          >
            🔄 Reset Student Progress
          </button>
        </div>
      </div>

      {/* Student Profile Card */}
      <div className="detail-profile-card">
        <div className="profile-main">
          <div className="profile-avatar">👤</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>{studentName}</h2>
            <p className="profile-meta" style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>
              Classroom: <strong style={{ color: 'var(--text-color)' }}>Class {student.class || `${student.grade}A`}</strong> &nbsp;|&nbsp; 
              Grade Level: <strong style={{ color: 'var(--text-color)' }}>Grade {student.grade}</strong> &nbsp;|&nbsp; 
              Student ID / Password: <code style={{ backgroundColor: 'var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--primary)', fontWeight: 'bold' }}>{student.id}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="report-stat-grid" style={{ marginBottom: '2rem' }}>
        <div className="report-stat-card accent-purple">
          <span className="report-stat-label">Total Stars ⭐</span>
          <span className="report-stat-value">{totalStars}</span>
          <span className="report-stat-desc">Earned in spelling games & quizzes</span>
        </div>
        <div className="report-stat-card accent-green">
          <span className="report-stat-label">Words Mastered 📚</span>
          <span className="report-stat-value">{masteredCount}</span>
          <span className="report-stat-desc">Vocabulary items completed correctly</span>
        </div>
        <div className="report-stat-card accent-gold">
          <span className="report-stat-label">Accuracy 🎯</span>
          <span className="report-stat-value">{accuracy}%</span>
          <span className="report-stat-desc">Correct inputs vs spelling errors</span>
        </div>
        <div className="report-stat-card accent-blue">
          <span className="report-stat-label">Total Practice Time ⏱️</span>
          <span className="report-stat-value">{formatTime(totalTime)}</span>
          <span className="report-stat-desc">Time spent doing active exercises</span>
        </div>
      </div>

      {/* Two Column details split */}
      <div className="detail-two-col">
        {/* Left Col: Mistakes & Vocabulary Detail */}
        <div className="detail-card main-detail-col">
          <div className="table-header-row responsive-stack" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Vocabulary Learning Details</h3>
            <div className="vocab-filters-group">
              <div className="filter-item">
                <label>Unit</label>
                <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="form-select">
                  <option value="ALL">All Units</option>
                  {[1,2,3,4,5,6,7,8].map(u => <option key={u} value={u}>Unit {u}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Lesson</label>
                <select value={lessonFilter} onChange={(e) => setLessonFilter(e.target.value)} className="form-select">
                  <option value="ALL">All Lessons</option>
                  {[1,2,3,4,5,6,7,8].map(l => <option key={l} value={l}>Lesson {l}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="report-vocab-table">
              <thead>
                <tr>
                  <th>Word / Translation</th>
                  <th>Topic Location</th>
                  <th style={{ textAlign: 'center' }}>Mastery Status</th>
                  <th style={{ textAlign: 'center' }}>Total Attempts</th>
                  <th style={{ textAlign: 'center' }}>Spelling Mistakes</th>
                </tr>
              </thead>
              <tbody>
                {displayedVocab.map(wordItem => {
                  const stats = prog[wordItem.id] || { attempts: 0, correct: false, wrongCount: 0, mistakes: [] };
                  const mistakes = stats.mistakes || [];

                  return (
                    <React.Fragment key={wordItem.id}>
                      <tr>
                        <td>
                          <strong style={{ fontSize: '1.1rem' }}>{wordItem.word}</strong>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{wordItem.thai}</div>
                        </td>
                        <td>Unit {wordItem.unit} - Lesson {wordItem.lesson}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${stats.correct ? 'status-badge-active' : 'idle-badge'}`} style={{
                            backgroundColor: stats.correct ? 'var(--success-light)' : 'var(--border-color)',
                            color: stats.correct ? 'var(--success)' : 'var(--text-muted)'
                          }}>
                            {stats.correct ? '🟢 Mastered' : '🟡 Practicing'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{stats.attempts}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: stats.wrongCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {stats.wrongCount}
                        </td>
                      </tr>
                      {mistakes.length > 0 && (
                        <tr className="mistake-log-row">
                          <td colSpan="5" style={{ padding: '0.75rem 1.25rem', backgroundColor: 'rgba(220, 53, 69, 0.05)' }}>
                            <div className="mistake-log-container">
                              <span className="mistake-label" style={{ fontWeight: 'bold', color: 'var(--danger)', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                ⚠️ Recorded Mistakes Detail:
                              </span>
                              <div className="mistake-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {mistakes.map((m, idx) => (
                                  <span key={idx} className="mistake-chip" style={{
                                    backgroundColor: '#fff',
                                    border: '1px solid rgba(220, 53, 69, 0.2)',
                                    color: 'var(--danger)',
                                    padding: '0.3rem 0.6rem',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}>
                                    ❌ Entered: <strong style={{ textDecoration: 'underline', marginLeft: '0.2rem' }}>{m.input}</strong> 
                                    <small style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>
                                      ({new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                    </small>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {displayedVocab.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                      No words found for Grade {student.grade} matching this unit/lesson filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Timeline of login times and dates */}
        <div className="detail-card timeline-col" style={{ flexGrow: 0, minWidth: '320px' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', margin: 0 }}>Student Access History</h3>
          <div className="timeline-container" style={{ marginTop: '1.5rem' }}>
            {studentLogs.map((log, idx) => {
              const logDate = new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
              const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={log.id} className="timeline-item" style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', position: 'relative' }}>
                  <div className="timeline-badge-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className={`timeline-indicator-dot ${log.action === 'Login' ? 'login-dot' : 'logout-dot'}`} style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: log.action === 'Login' ? 'var(--success)' : 'var(--text-muted)',
                      border: '2px solid #fff',
                      zIndex: 2
                    }}></div>
                    {idx < studentLogs.length - 1 && (
                      <div className="timeline-line" style={{
                        width: '2px',
                        flexGrow: 1,
                        backgroundColor: 'var(--border-color)',
                        marginTop: '0.25rem',
                        marginBottom: '0.25rem',
                        minHeight: '40px'
                      }}></div>
                    )}
                  </div>
                  <div className="timeline-content-box" style={{
                    flexGrow: 1,
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    boxShadow: 'var(--box-shadow-sm)'
                  }}>
                    <div className="timeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{log.action === 'Login' ? '📥 Logged In' : '📤 Logged Out'}</strong>
                      <span className="timeline-time" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{logDate} {logTime}</span>
                    </div>
                    <p className="timeline-details" style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Device: <strong>{log.device}</strong>
                    </p>
                  </div>
                </div>
              );
            })}
            {studentLogs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                No session logins or actions recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
