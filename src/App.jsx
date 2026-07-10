import React, { useContext } from 'react';
import { AppProvider, AppContext } from './contexts/AppContext';
import LoginPortal from './components/LoginPortal';
import StudentPortal from './components/StudentPortal';
import TeacherPortal from './components/TeacherPortal';
import AdminPortal from './components/AdminPortal';
import './App.css';

function MainAppContent() {
  const { currentUser } = useContext(AppContext);

  if (!currentUser) {
    return <LoginPortal />;
  }

  switch (currentUser.role) {
    case 'student':
      return <StudentPortal />;
    case 'teacher':
      return <TeacherPortal />;
    case 'admin':
      return <AdminPortal />;
    default:
      return <LoginPortal />;
  }
}

function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

export default App;
