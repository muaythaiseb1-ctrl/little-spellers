import React, { useState, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';

export default function LoginPortal() {
  const { students, loginUser } = useContext(AppContext);
  
  const [role, setRole] = useState('student'); // 'student' | 'teacher' | 'admin'
  const [selectedClass, setSelectedClass] = useState('1A');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('teacher');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
 
  // Filter students based on class
  const filteredStudents = students.filter(s => s.class === selectedClass);
 
  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    let credentials;
    if (role === 'student') {
      if (!selectedStudent) {
        setError('Please select your name.');
        return;
      }
      if (!studentPassword.trim()) {
        setError('Please enter your password.');
        return;
      }
      credentials = { role: 'student', studentName: selectedStudent, password: studentPassword.trim() };
    } else if (role === 'teacher') {
      credentials = { role: 'teacher', username: teacherUsername, password: teacherPassword };
    } else {
      credentials = { role: 'admin', username: adminUsername, password: adminPassword };
    }

    // Passwords are checked on the server, never in this file.
    setSubmitting(true);
    const result = await loginUser(credentials);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card animate-fade-in">
        <div className="login-header">
          <div className="app-logo">
            <span className="logo-sparkle">✨</span>
            <span className="logo-text">Little Spellers</span>
          </div>
          <p className="login-subtitle">Interactive spelling and vocabulary hub</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="role-tabs">
          <button 
            type="button" 
            className={`role-tab ${role === 'student' ? 'active' : ''}`}
            onClick={() => { setRole('student'); setError(''); }}
          >
            🎓 Student
          </button>
          <button 
            type="button" 
            className={`role-tab ${role === 'teacher' ? 'active' : ''}`}
            onClick={() => { setRole('teacher'); setError(''); }}
          >
            👩‍🏫 Teacher
          </button>
          <button 
            type="button" 
            className={`role-tab ${role === 'admin' ? 'active' : ''}`}
            onClick={() => { setRole('admin'); setError(''); }}
          >
            🛡️ Admin
          </button>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message animate-shake">{error}</div>}

          {role === 'student' && (
            <>
              <div className="form-group">
                <label>Select Class</label>
                <div className="class-grid">
                  {['1A', '2A', '2B', '3A', '4A', '4B', '5A', '5B', '6A'].map(cls => (
                    <button
                      key={cls}
                      type="button"
                      className={`grade-btn ${selectedClass === cls ? 'active' : ''}`}
                      onClick={() => { setSelectedClass(cls); setSelectedStudent(''); }}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="student-select">Find Your Name</label>
                <select
                  id="student-select"
                  value={selectedStudent}
                  onChange={(e) => {
                    setSelectedStudent(e.target.value);
                    setStudentPassword('');
                  }}
                  className="form-select"
                >
                  <option value="">-- Choose Name --</option>
                  {filteredStudents.map(student => (
                    <option key={student.id} value={student.name}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStudent && (
                <div className="form-group animate-fade-in">
                  <label htmlFor="student-pass">Password (Your Student ID)</label>
                  <input
                    id="student-pass"
                    type="password"
                    placeholder="Enter Student ID password"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              )}
            </>
          )}

          {role === 'teacher' && (
            <>
              <div className="form-group">
                <label htmlFor="teacher-user">Username</label>
                <input
                  id="teacher-user"
                  type="text"
                  placeholder="e.g. teacher"
                  value={teacherUsername}
                  onChange={(e) => setTeacherUsername(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="teacher-pass">Password</label>
                <input
                  id="teacher-pass"
                  type="password"
                  placeholder="Enter Password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </>
          )}

          {role === 'admin' && (
            <>
              <div className="form-group">
                <label htmlFor="admin-user">Admin Username</label>
                <input
                  id="admin-user"
                  type="text"
                  placeholder="e.g. admin"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="admin-pass">Admin Password</label>
                <input
                  id="admin-pass"
                  type="password"
                  placeholder="Enter Admin Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="submit-btn hover-glow" disabled={submitting}>
            {submitting ? 'Checking...' : 'Start Learning 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}
