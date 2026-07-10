import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useViewport } from '../hooks/useViewport';

export default function StudentPortal() {
  const { vocabulary, currentUser, studentProgress, sessionLogs, updateProgress, logoutUser, setIsExerciseActive, assignments } = useContext(AppContext);
  const { isMobile, isTablet } = useViewport();
  
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('little_spellers_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('little_spellers_theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('little_spellers_theme', 'light');
    }
  }, [darkMode]);

  // Views: 'units' | 'lessons' | 'activity'
  const [view, setView] = useState('units');
  
  // Track active exercise state in context
  const [activity, setActivity] = useState(null);
  useEffect(() => {
    setIsExerciseActive(!!activity);
    return () => setIsExerciseActive(false);
  }, [activity, setIsExerciseActive]);

  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);

  // Spelling activity states
  const [spellingInput, setSpellingInput] = useState('');
  const [spellingComplete, setSpellingComplete] = useState(false);
  const [spellingError, setSpellingError] = useState(false);
  const [scrambledLetters, setScrambledLetters] = useState([]);
  const [revealedHint, setRevealedHint] = useState(false);
  const mobileInputRef = useRef(null);
  
  // Quiz activity states
  const [quizOptions, setQuizOptions] = useState([]);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [selectedWrongOptions, setSelectedWrongOptions] = useState([]);
  const [virtualFullscreen, setVirtualFullscreen] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [quizStates, setQuizStates] = useState({});
  const [hintsUsed, setHintsUsed] = useState(0);
  const [activityRunId, setActivityRunId] = useState(0);

  // Flashcard states
  const [isFlipped, setIsFlipped] = useState(false);

  // Get words for the current student's grade, selected unit, and lesson
  const wordsForLesson = vocabulary.filter(w => 
    Number(w.grade) === Number(currentUser?.grade) &&
    Number(w.unit) === Number(selectedUnit) &&
    Number(w.lesson) === Number(selectedLesson)
  );

  // Calculate student statistics
  const studentData = studentProgress[currentUser?.name] || {};
  const totalStars = Object.values(studentData).reduce((sum, item) => sum + (item.score || 0), 0);
  const wordsMasteredCount = Object.values(studentData).filter(item => item.correct).length;

  // Google TTS Audio with Web Speech API Fallback
  const speakWord = (word) => {
    const cleanWord = word.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const audioUrl = `/audio/${cleanWord}.mp3`;
    const audio = new Audio(audioUrl);
    audio.playbackRate = 0.85; // Slower speed for child-friendly pronunciation

    let fallbackUsed = false;
    const triggerFallback = () => {
      if (fallbackUsed) return;
      fallbackUsed = true;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.85; // Slower speed for fallback
        window.speechSynthesis.speak(utterance);
      }
    };

    audio.addEventListener('error', triggerFallback);
    
    audio.play().catch(() => {
      triggerFallback();
    });
  };

  // Export current student progress to JSON
  const exportStudentProgress = () => {
    const dataStr = JSON.stringify({
      studentName: currentUser?.name,
      studentId: currentUser?.id,
      progress: studentProgress[currentUser?.name] || {},
      logs: sessionLogs.filter(l => l.name === currentUser?.name)
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `progress_${currentUser?.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Scramble word letters helper
  const initializeSpelling = (word) => {
    setSpellingInput('');
    setSpellingComplete(false);
    setSpellingError(false);
    setRevealedHint(false);
    setHintsUsed(0);
    speakWord(word);
    
    // Scramble letters
    const letters = word.toUpperCase().split('');
    // Fisher-Yates shuffle
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    setScrambledLetters(letters.map((char, index) => ({ char, id: `${char}-${index}`, used: false })));
  };

  // Initialize Quiz helper
  const initializeQuiz = (currentWord) => {
    const existing = quizStates[currentWord.id];
    if (existing) {
      setQuizAnswered(existing.answered);
      setSelectedQuizOption(existing.selectedOption);
      setSelectedWrongOptions(existing.wrongOptions);
      setQuizOptions(existing.options);
      return;
    }

    setQuizAnswered(false);
    setSelectedQuizOption(null);
    setSelectedWrongOptions([]);
    
    // Find wrong options from the same grade
    const allGradeWords = vocabulary.filter(w => Number(w.grade) === Number(currentUser?.grade));
    const wrongWords = allGradeWords
      .filter(w => w.word !== currentWord.word && w.thai)
      .map(w => w.thai);
      
    // Shuffle and pick 3 wrong options
    const shuffledWrong = wrongWords.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    // Combine with correct and shuffle
    const options = [currentWord.thai, ...shuffledWrong].sort(() => 0.5 - Math.random());
    setQuizOptions(options);

    setQuizStates(prev => ({
      ...prev,
      [currentWord.id]: {
        answered: false,
        selectedOption: null,
        wrongOptions: [],
        options: options
      }
    }));
  };

  // Initialize activity
  useEffect(() => {
    if (wordsForLesson.length > 0 && activity) {
      const currentWord = wordsForLesson[currentIndex];
      if (activity === 'spelling') {
        initializeSpelling(currentWord.word);
      } else if (activity === 'quiz') {
        initializeQuiz(currentWord);
      } else if (activity === 'flashcards') {
        setIsFlipped(false);
        speakWord(currentWord.word);
      }
    }
  }, [activity, currentIndex, selectedUnit, selectedLesson, activityRunId]);

  // Handle letter tile click
  const handleTileClick = (tile) => {
    if (spellingComplete) return;
    
    setScrambledLetters(prev => prev.map(t => t.id === tile.id ? { ...t, used: true } : t));
    const newInput = spellingInput + tile.char;
    setSpellingInput(newInput);

    const currentWord = wordsForLesson[currentIndex].word.toUpperCase();
    if (newInput === currentWord) {
      setSpellingComplete(true);
      setSpellingError(false);
      updateProgress(currentUser.name, wordsForLesson[currentIndex].id, true, 10);
      // Play ding sound
      speakWord("Well done!");
    } else if (!currentWord.startsWith(newInput)) {
      setSpellingError(true);
      updateProgress(currentUser.name, wordsForLesson[currentIndex].id, false, -2, newInput);
      // Vibrate or flash red
      setTimeout(() => setSpellingError(false), 500);
    }
  };

  const handleBackspace = () => {
    if (spellingInput.length === 0 || spellingComplete) return;
    const lastChar = spellingInput[spellingInput.length - 1];
    setSpellingInput(prev => prev.slice(0, -1));
    
    // Find the last used tile of this character and mark as unused
    setScrambledLetters(prev => {
      const index = prev.map(t => t.used && t.char === lastChar).lastIndexOf(true);
      if (index !== -1) {
        return prev.map((t, idx) => idx === index ? { ...t, used: false } : t);
      }
      return prev;
    });
  };

  const focusMobileInput = () => {
    if (mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  };

  const handleMobileInputChange = (e) => {
    if (spellingComplete) return;
    const val = e.target.value;
    
    // If backspace (value is shorter than spellingInput)
    if (val.length < spellingInput.length) {
      handleBackspace();
      return;
    }
    
    // If typing a new letter (value is longer)
    if (val.length > spellingInput.length) {
      const newChar = val[val.length - 1].toUpperCase();
      // Find unused tile matching this character
      const availableTile = scrambledLetters.find(t => !t.used && t.char === newChar);
      if (availableTile) {
        handleTileClick(availableTile);
      }
    }
  };

  const handleMobileInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (spellingComplete) {
        handleNext();
      }
    }
  };

  const toggleFullscreen = () => {
    const docEl = document.documentElement;
    const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;

    if (requestFS && !/iPhone|iPod/.test(navigator.userAgent)) {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        requestFS.call(docEl).catch(() => {
          setVirtualFullscreen(prev => !prev);
        });
      } else {
        exitFS.call(document);
      }
    } else {
      setVirtualFullscreen(prev => !prev);
    }
  };

  // Keyboard support for all activities
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (view !== 'activity' || wordsForLesson.length === 0) return;

      const key = e.key;

      // 1. FLASHCARDS
      if (activity === 'flashcards') {
        if (key === 'ArrowRight') {
          handleNext();
        } else if (key === 'ArrowLeft') {
          handleBack();
        } else if (key.toLowerCase() === 's' || key.toLowerCase() === 'p') {
          speakWord(wordsForLesson[currentIndex].word);
        }
      }

      // 2. QUIZ
      else if (activity === 'quiz') {
        if (key === 'ArrowLeft' || key === 'Backspace') {
          handleBack();
        } else if (quizAnswered) {
          if (key === 'Enter' || key === 'ArrowRight') {
            handleNext();
          }
        } else {
          if (key >= '1' && key <= '4') {
            const optIdx = parseInt(key) - 1;
            if (optIdx < quizOptions.length) {
              handleQuizAnswer(quizOptions[optIdx]);
            }
          }
        }
      }

      // 3. SPELLING
      else if (activity === 'spelling') {
        if (key === 'ArrowLeft') {
          handleBack();
        } else if (spellingComplete) {
          if (key === 'Enter' || key === 'ArrowRight') {
            handleNext();
          }
        } else {
          const char = key.toUpperCase();
          if (key === 'Backspace') {
            handleBackspace();
          } else if (/^[A-Z\s\-]$/.test(char)) {
            // Find unused tile matching this character
            const availableTile = scrambledLetters.find(t => !t.used && t.char === char);
            if (availableTile) {
              handleTileClick(availableTile);
            } else {
              // Direct typing fallback
              const newInput = spellingInput + char;
              setSpellingInput(newInput);
              const currentWord = wordsForLesson[currentIndex].word.toUpperCase();
              if (newInput === currentWord) {
                setSpellingComplete(true);
                updateProgress(currentUser.name, wordsForLesson[currentIndex].id, true, 10);
                speakWord("Well done!");
              } else if (!currentWord.startsWith(newInput)) {
                setSpellingError(true);
                updateProgress(currentUser.name, wordsForLesson[currentIndex].id, false, -2, newInput);
                setTimeout(() => setSpellingError(false), 500);
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, activity, wordsForLesson, currentIndex, isFlipped, quizAnswered, quizOptions, spellingComplete, scrambledLetters, spellingInput, selectedWrongOptions]);

  const handleQuizAnswer = (option) => {
    const currentWord = wordsForLesson[currentIndex];
    const correctThai = currentWord.thai;
    const isCorrect = option === correctThai;

    if (isCorrect) {
      setSelectedQuizOption(option);
      setQuizAnswered(true);

      setQuizStates(prev => {
        const currentCorr = prev[currentWord.id] || {};
        return {
          ...prev,
          [currentWord.id]: {
            ...currentCorr,
            answered: true,
            selectedOption: option
          }
        };
      });

      updateProgress(currentUser.name, currentWord.id, true, 10);
      speakWord("Well done!");
    } else {
      if (!selectedWrongOptions.includes(option)) {
        const nextWrong = [...selectedWrongOptions, option];
        setSelectedWrongOptions(nextWrong);

        setQuizStates(prev => {
          const currentCorr = prev[currentWord.id] || {};
          return {
            ...prev,
            [currentWord.id]: {
              ...currentCorr,
              wrongOptions: nextWrong
            }
          };
        });

        updateProgress(currentUser.name, currentWord.id, false, -2, option);
        speakWord("Try again");
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < wordsForLesson.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Finished all words in lesson!
      setShowCompletionModal(true);
      speakWord(`Congratulations! You have finished Lesson ${selectedLesson}! Outstanding work!`);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Group vocabulary by lessons for current grade
  const lessonsMap = {};
  vocabulary
    .filter(w => Number(w.grade) === Number(currentUser?.grade))
    .forEach(w => {
      const u = Number(w.unit);
      const l = Number(w.lesson);
      if (!lessonsMap[u]) lessonsMap[u] = {};
      if (!lessonsMap[u][l]) lessonsMap[u][l] = 0;
      lessonsMap[u][l]++;
    });

  // Filter active assignments for the current student's grade
  const activeAssignments = (assignments || []).filter(a => 
    a.active && Number(a.grade) === Number(currentUser?.grade)
  );

  return (
    <div className={`student-dashboard ${darkMode ? 'dark-theme' : ''} ${isMobile || isTablet ? 'viewport-lock' : ''} ${virtualFullscreen ? 'virtual-fullscreen' : ''}`}>
      {/* Top Header */}
      <header className={`student-header animate-slide-down ${view === 'activity' ? 'hide-on-mobile-activity' : ''}`}>
        <div className="header-left">
          <h1>Hello, {currentUser?.name}! 🎓</h1>
          <p className="grade-badge">Grade {currentUser?.grade}</p>
        </div>
        <div className="header-right">
          <div className="stats-badges">
            <div className="stat-badge tooltip">
              ⭐ {totalStars} <span className="tooltiptext">Total Score Stars</span>
            </div>
            <div className="stat-badge tooltip">
              🏆 {wordsMasteredCount} <span className="tooltiptext">Words Mastered</span>
            </div>
          </div>
          
          
          <button 
            type="button" 
            className="fullscreen-btn hover-glow"
            onClick={toggleFullscreen}
            style={{ marginRight: '0.5rem' }}
          >
            {virtualFullscreen ? '📴 Exit Full' : '🖥️ Full Screen'}
          </button>
          
          <button 
            type="button" 
            className="theme-toggle-btn"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          
          <button 
            type="button" 
            className="logout-btn"
            onClick={logoutUser}
          >
            Sign Out 🚪
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`student-content container ${isMobile || isTablet ? 'scrollable-content' : ''}`}>
        {view === 'units' && (
          <div className="units-view animate-fade-in">
            {/* Active Class Assignments Section */}
            {activeAssignments.length > 0 && (
              <div className="assignments-container" style={{ marginBottom: '2.5rem' }}>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem' }}>
                  📋 Active Class Assignments
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {activeAssignments.map(assign => (
                    <div 
                      key={assign.id}
                      className="report-stat-card accent-purple hover-glow"
                      style={{ 
                        padding: '1.5rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.75rem',
                        margin: 0,
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="report-stat-label" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            UNIT {assign.unit} | LESSON {assign.lesson}
                          </span>
                          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2, display: 'block', marginTop: '0.25rem' }}>
                            {assign.title}
                          </span>
                        </div>
                        <span style={{ fontSize: '1.5rem' }}>📢</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button 
                          type="button" 
                          className="activity-btn flashcard-style"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                          onClick={() => {
                            setQuizStates({});
                            setSelectedUnit(Number(assign.unit));
                            setSelectedLesson(Number(assign.lesson));
                            setActivity('flashcards');
                            setCurrentIndex(0);
                            setActivityRunId(prev => prev + 1);
                            setView('activity');
                          }}
                        >
                          📇 Flashcards
                        </button>
                        <button 
                          type="button" 
                          className="activity-btn spelling-style"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                          onClick={() => {
                            setQuizStates({});
                            setSelectedUnit(Number(assign.unit));
                            setSelectedLesson(Number(assign.lesson));
                            setActivity('spelling');
                            setCurrentIndex(0);
                            setActivityRunId(prev => prev + 1);
                            setView('activity');
                          }}
                        >
                          ✍️ Spelling Game
                        </button>
                        <button 
                          type="button" 
                          className="activity-btn quiz-style"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                          onClick={() => {
                            setQuizStates({});
                            setSelectedUnit(Number(assign.unit));
                            setSelectedLesson(Number(assign.lesson));
                            setActivity('quiz');
                            setCurrentIndex(0);
                            setActivityRunId(prev => prev + 1);
                            setView('activity');
                          }}
                        >
                          🎮 Thai Quiz
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 className="section-title">Select a Vocabulary Unit</h2>
            <div className="units-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(unitNo => {
                const totalWordsInUnit = vocabulary.filter(w => 
                  Number(w.grade) === Number(currentUser?.grade) && Number(w.unit) === unitNo
                ).length;

                // Calculate progress
                const unitWords = vocabulary.filter(w => Number(w.grade) === Number(currentUser?.grade) && Number(w.unit) === unitNo);
                const masteredInUnit = unitWords.filter(w => studentData[w.id]?.correct).length;
                const progressPct = totalWordsInUnit > 0 ? Math.round((masteredInUnit / totalWordsInUnit) * 100) : 0;

                return (
                  <div 
                    key={unitNo}
                    className="unit-card hover-glow"
                    onClick={() => {
                      setSelectedUnit(unitNo);
                      setView('lessons');
                    }}
                  >
                    <div className="unit-icon">📘</div>
                    <h3>Unit {unitNo}</h3>
                    <p>{totalWordsInUnit} Words total</p>
                    <div className="progress-container">
                      <div className="progress-bar" style={{ width: `${progressPct}%` }}></div>
                    </div>
                    <span className="progress-text">{progressPct}% Mastered</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'lessons' && (
          <div className="lessons-view animate-fade-in">
            <div className="view-header">
              <button 
                type="button" 
                className="back-btn" 
                onClick={() => setView('units')}
              >
                ⬅️ Back to Units
              </button>
              <h2>Unit {selectedUnit} Lessons</h2>
            </div>
            
            <div className="lessons-list">
              {Object.keys(lessonsMap[selectedUnit] || {}).sort((a, b) => a - b).map(lessonNo => {
                const totalWords = lessonsMap[selectedUnit][lessonNo];
                
                // Progress
                const lessonWords = vocabulary.filter(w => 
                  Number(w.grade) === Number(currentUser?.grade) && 
                  Number(w.unit) === selectedUnit && 
                  Number(w.lesson) === Number(lessonNo)
                );
                const masteredInLesson = lessonWords.filter(w => studentData[w.id]?.correct).length;
                const progressPct = totalWords > 0 ? Math.round((masteredInLesson / totalWords) * 100) : 0;

                return (
                  <div key={lessonNo} className="lesson-item-card">
                    <div className="lesson-details">
                      <h4>Lesson {lessonNo}</h4>
                      <p>{totalWords} words to learn ({masteredInLesson} mastered)</p>
                      <div className="lesson-mini-progress">
                        <div className="lesson-mini-bar" style={{ width: `${progressPct}%` }}></div>
                      </div>
                    </div>
                    <div className="activity-buttons">
                      <button 
                        type="button" 
                        className="activity-btn flashcard-style"
                        onClick={() => {
                          setQuizStates({});
                          setSelectedLesson(Number(lessonNo));
                          setActivity('flashcards');
                          setCurrentIndex(0);
                          setActivityRunId(prev => prev + 1);
                          setView('activity');
                        }}
                      >
                        📇 Flashcards
                      </button>
                      <button 
                        type="button" 
                        className="activity-btn spelling-style"
                        onClick={() => {
                          setQuizStates({});
                          setSelectedLesson(Number(lessonNo));
                          setActivity('spelling');
                          setCurrentIndex(0);
                          setActivityRunId(prev => prev + 1);
                          setView('activity');
                        }}
                      >
                        ✍️ Spelling Game
                      </button>
                      <button 
                        type="button" 
                        className="activity-btn quiz-style"
                        onClick={() => {
                          setQuizStates({});
                          setSelectedLesson(Number(lessonNo));
                          setActivity('quiz');
                          setCurrentIndex(0);
                          setActivityRunId(prev => prev + 1);
                          setView('activity');
                        }}
                      >
                        🎮 Thai Quiz
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'activity' && wordsForLesson.length > 0 && (
          <div className="activity-view animate-scale-up">
            <div className="view-header-compact">
              <button 
                type="button" 
                className="back-btn-compact hover-glow" 
                onClick={() => {
                  setView('lessons');
                  setActivity(null);
                }}
              >
                ⬅️ Back
              </button>
              <div className="activity-header-info">
                <h3>Unit {selectedUnit} - Lesson {selectedLesson}</h3>
                <span className="step-counter-compact">Word {currentIndex + 1} of {wordsForLesson.length}</span>
              </div>
              <div className="activity-progress-bar-container-compact">
                <div 
                  className="activity-progress-bar-fill" 
                  style={{ width: `${((currentIndex + 1) / wordsForLesson.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="activity-workspace-layout">
              {/* Desktop Side Navigation Buttons (Flanking the cards) */}
              <button 
                type="button" 
                className="desktop-side-nav-btn prev-btn hover-glow"
                onClick={handleBack}
                disabled={currentIndex === 0}
                title="Previous Word (Left Arrow Key)"
              >
                ◀
              </button>

              {/* Workspace Card Area */}
              <div className="activity-main-card-area">
                {/* FLASHCARD MODE */}
                {activity === 'flashcards' && (
                  <div className="activity-split-container">
                    <div className="activity-split-left">
                      <div className="card-container" style={{ marginBottom: 0 }}>
                        <div className="flashcard">
                          {/* Front Side */}
                          <div className="card-front">
                            <div className="card-image-wrapper">
                              <img 
                                src={wordsForLesson[currentIndex].image} 
                                alt={wordsForLesson[currentIndex].word}
                                onError={(e) => { e.target.src = '/images/design/dragon_mascot.png'; }} 
                              />
                            </div>
                            <div className="word-pronounce-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', marginTop: '0.75rem' }}>
                              <h2 className="word-text">{wordsForLesson[currentIndex].word}</h2>
                              <h3 className="thai-translation-text" style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1.45rem' }}>
                                {wordsForLesson[currentIndex].thai || 'ไม่มีคำแปล (No Translation)'}
                              </h3>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="activity-split-right">
                      <div className="word-details-panel">
                        <button 
                          type="button"
                          className="speaker-hint-btn hover-glow"
                          onClick={() => speakWord(wordsForLesson[currentIndex].word)}
                          style={{ width: 'auto', alignSelf: 'center' }}
                        >
                          🔊 Hear Word
                        </button>
                        <div className="word-details-info">
                          {wordsForLesson[currentIndex].definition && (
                            <p className="detail-definition"><strong>Meaning:</strong> {wordsForLesson[currentIndex].definition}</p>
                          )}
                          {wordsForLesson[currentIndex].example && (
                            <p className="detail-example"><strong>Example:</strong> <em>"{wordsForLesson[currentIndex].example}"</em></p>
                          )}
                        </div>
                        <div className="desktop-keyboard-hint">
                          ⌨️ Left/Right Arrows: Navigation | [S] Hear Word
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SPELLING PRACTICE GAME */}
                {activity === 'spelling' && (
                  <div className="activity-split-container">
                    <div className="activity-split-left">
                      <div className="spelling-image-hint-large">
                        <img 
                          src={wordsForLesson[currentIndex].image} 
                          alt="Hint"
                          onError={(e) => { e.target.src = '/images/design/dragon_mascot.png'; }}
                        />
                      </div>
                      <button 
                        type="button" 
                        className="speaker-hint-btn hover-glow"
                        onClick={() => speakWord(wordsForLesson[currentIndex].word)}
                        style={{ margin: '0.5rem 0' }}
                      >
                        🔊 Hear Word
                      </button>
                      <h2 className="thai-spelling-translation">{wordsForLesson[currentIndex].thai}</h2>
                    </div>
                    <div className="activity-split-right">
                      <div className="spelling-action-panel">
                        {/* Hidden Input for Native Keyboard */}
                        <input
                          ref={mobileInputRef}
                          type="text"
                          value={spellingInput}
                          onChange={handleMobileInputChange}
                          onKeyDown={handleMobileInputKeyDown}
                          style={{
                            position: 'absolute',
                            opacity: 0,
                            pointerEvents: 'none',
                            width: '1px',
                            height: '1px',
                            zIndex: -1
                          }}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                        />

                        {/* Input Area */}
                        <div 
                          className={`spelling-input-field ${spellingError ? 'error-shake' : ''} ${spellingComplete ? 'success-pop' : ''}`}
                          onClick={focusMobileInput}
                          style={{ cursor: 'pointer' }}
                        >
                          {wordsForLesson[currentIndex].word.split('').map((char, index) => {
                            const typedChar = spellingInput[index] || '';
                            return (
                              <span 
                                key={index} 
                                className={`letter-box ${typedChar ? 'filled' : ''} ${spellingComplete ? 'correct' : ''}`}
                              >
                                {typedChar}
                              </span>
                            );
                          })}
                        </div>
                        {!spellingComplete ? (
                          <div className="desktop-keyboard-hint" style={{ margin: '0.25rem 0' }}>
                            <span className="desktop-only-inline">⌨️ Physical Keyboard Active: Type to spell! Press [Backspace] to delete.</span>
                            <button 
                              type="button" 
                              className="mobile-keyboard-btn hover-glow"
                              onClick={focusMobileInput}
                            >
                              ⌨️ Tap to type with keyboard
                            </button>
                          </div>
                        ) : (
                          <div className="desktop-keyboard-hint" style={{ borderStyle: 'solid', borderColor: '#28a745', margin: '0.25rem 0' }}>
                            <span className="desktop-only-inline">⌨️ Correct! Press [Enter] or [Right Arrow] to go to the Next Word!</span>
                            <span className="mobile-only-inline">🎉 Correct! Tap 'Next Word' below!</span>
                          </div>
                        )}

                        {/* Hint Revealer */}
                        {!spellingComplete && (() => {
                          const word = wordsForLesson[currentIndex].word;
                          let maxHintsAllowed = 3;
                          if (word.length <= 3) {
                            maxHintsAllowed = 1;
                          } else if (word.length <= 5) {
                            maxHintsAllowed = 2;
                          }
                          const remainingHints = maxHintsAllowed - hintsUsed;

                          return (
                            <div className="hint-revealer" style={{ margin: '0.25rem 0' }}>
                              <button 
                                type="button" 
                                className="hint-link-btn"
                                disabled={hintsUsed >= maxHintsAllowed}
                                style={hintsUsed >= maxHintsAllowed ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                onClick={() => {
                                  if (hintsUsed < maxHintsAllowed) {
                                    const nextCharIndex = spellingInput.length;
                                    if (nextCharIndex >= word.length) return;
                                    const targetChar = word[nextCharIndex].toUpperCase();
                                    
                                    // Mark the matching scrambled tile as used
                                    setScrambledLetters(prev => {
                                      const tileIndex = prev.findIndex(t => !t.used && t.char === targetChar);
                                      if (tileIndex !== -1) {
                                        return prev.map((t, idx) => idx === tileIndex ? { ...t, used: true } : t);
                                      }
                                      return prev;
                                    });

                                    const nextInput = spellingInput + targetChar;
                                    setSpellingInput(nextInput);
                                    setHintsUsed(prev => prev + 1);
                                    setRevealedHint(true);

                                    // Check if complete
                                    if (nextInput === word.toUpperCase()) {
                                      setSpellingComplete(true);
                                      setSpellingError(false);
                                      updateProgress(currentUser.name, wordsForLesson[currentIndex].id, true, 10);
                                      speakWord("Well done!");
                                    }
                                  }
                                }}
                              >
                                {remainingHints > 0 
                                  ? `💡 Give me a letter hint (${remainingHints} left)`
                                  : `❌ No hints left`
                                }
                              </button>
                            </div>
                          );
                        })()}

                        {/* Letter Tiles */}
                        {!spellingComplete && (
                          <div className="letter-tiles-container" style={{ width: '100%' }}>
                            <div className="tiles-grid">
                              {scrambledLetters.map(tile => (
                                <button
                                  key={tile.id}
                                  type="button"
                                  className={`letter-tile hover-glow ${tile.used ? 'used' : ''}`}
                                  onClick={() => !tile.used && handleTileClick(tile)}
                                  disabled={tile.used}
                                >
                                  {tile.char}
                                </button>
                              ))}
                              {/* Integrated Backspace button tile inside grid */}
                              <button
                                type="button"
                                className="letter-tile hover-glow backspace-tile-inline"
                                onClick={handleBackspace}
                                style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', fontWeight: 800 }}
                              >
                                ⌫
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Completion screen */}
                        {spellingComplete && (
                          <div className="completion-overlay animate-scale-up" style={{ position: 'relative', top: 'auto', transform: 'none', width: '100%', margin: '0.5rem 0' }}>
                            <div className="star-explosion">⭐ +10 STARS! ⭐</div>
                            <p className="success-banner">Excellent Job! The spelling is correct.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* THAI MEANING QUIZ */}
                {activity === 'quiz' && (
                  <div className="activity-split-container">
                    <div className="activity-split-left">
                      <div className="quiz-mascot-image">
                        <img 
                          src={wordsForLesson[currentIndex].image || '/images/design/dragon_mascot.png'}
                          alt="Question mascot"
                          onError={(e) => { e.target.src = '/images/design/dragon_mascot.png'; }}
                        />
                      </div>
                      <button 
                        type="button" 
                        className="speaker-hint-btn hover-glow"
                        onClick={() => speakWord(wordsForLesson[currentIndex].word)}
                        style={{ margin: '0.75rem 0' }}
                      >
                        🔊 Hear Word
                      </button>
                      <h1 className="question-word-large">{wordsForLesson[currentIndex].word}</h1>
                      <p className="question-prompt-text">Choose the correct Thai translation:</p>
                    </div>
                    <div className="activity-split-right">
                      <div className="quiz-action-panel">
                        <div className="quiz-options-grid-split">
                          {quizOptions.map((option, idx) => {
                            const isCorrect = option === wordsForLesson[currentIndex].thai;
                            const isWrongSelected = selectedWrongOptions.includes(option);
                            
                            let btnClass = 'quiz-option-btn';
                            let btnStyle = {};
                            
                            if (isWrongSelected) {
                              btnStyle = { opacity: 0.4, cursor: 'not-allowed' };
                            } else if (quizAnswered && isCorrect) {
                              btnClass += ' correct-option';
                            } else if (quizAnswered) {
                              btnClass += ' disabled-option';
                            }

                            return (
                              <button
                                key={idx}
                                type="button"
                                className={btnClass}
                                style={btnStyle}
                                onClick={() => handleQuizAnswer(option)}
                                disabled={quizAnswered || isWrongSelected}
                              >
                                <span className="quiz-option-key">{idx + 1}</span>
                                {option}
                                {isWrongSelected && <span className="option-badge"> ❌</span>}
                                {quizAnswered && isCorrect && <span className="option-badge"> ✔</span>}
                              </button>
                            );
                          })}
                        </div>

                        {!quizAnswered ? (
                          <div className="desktop-keyboard-hint" style={{ margin: '0.5rem 0' }}>
                            ⌨️ Press keys [1], [2], [3], or [4] to select your answer!
                          </div>
                        ) : (
                          <div className="desktop-keyboard-hint" style={{ borderStyle: 'solid', borderColor: '#7c3aed', margin: '0.5rem 0' }}>
                            ⌨️ Press [Enter] or [Right Arrow] to go to the Next Word!
                          </div>
                        )}

                        {quizAnswered && (
                          <div className="quiz-feedback-box-split animate-fade-in">
                            {selectedQuizOption === wordsForLesson[currentIndex].thai ? (
                              <div className="feedback-correct">🌟 Perfect! Correct translation!</div>
                            ) : (
                              <div className="feedback-wrong">
                                ❌ Oops! The correct translation is <strong>{wordsForLesson[currentIndex].thai}</strong>.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="activity-nav-row" style={{ width: '100%', maxWidth: activity === 'flashcards' ? '520px' : activity === 'spelling' ? '650px' : '580px', marginTop: '1.25rem' }}>
                  <button 
                    type="button" 
                    className="nav-btn"
                    onClick={handleBack}
                    disabled={currentIndex === 0}
                  >
                    ◀ Previous
                  </button>

                  <button 
                    type="button" 
                    className="nav-btn next-accent"
                    onClick={handleNext}
                    disabled={activity !== 'flashcards' && !spellingComplete && !quizAnswered}
                  >
                    Next Word ▶
                  </button>
                </div>
              </div>

              {/* Desktop Side Navigation Buttons (Flanking the cards) */}
              <button 
                type="button" 
                className="desktop-side-nav-btn next-btn next-accent hover-glow"
                onClick={handleNext}
                disabled={activity !== 'flashcards' && !spellingComplete && !quizAnswered}
                title="Next Word (Right Arrow/Enter Key)"
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Lesson Completion Custom Modal */}
      {showCompletionModal && (
        <div className="report-modal-overlay animate-fade-in" style={{ zIndex: 999999 }}>
          <div className="report-modal-content animate-scale-up" style={{ maxWidth: '580px', textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '6rem', marginBottom: '1.25rem', animation: 'bounce 1s infinite' }}>🎉</div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '0.5rem' }}>CONGRATULATIONS!</h1>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              You finished Lesson {selectedLesson}!
            </h2>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.25rem' }}>
              <img 
                src="/images/design/dragon_mascot.png" 
                alt="Mascot Dragon" 
                style={{ width: '180px', height: '180px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', marginBottom: '2.25rem', fontWeight: 700 }}>
              You earned stars and mastered all spelling words! Keep up the amazing work! 🌟
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="nav-btn next-accent hover-glow" 
                style={{ padding: '0.85rem 2rem', fontSize: '1.1rem', fontWeight: 'bold' }}
                onClick={() => {
                  setShowCompletionModal(false);
                  setActivity(null);
                  setView('lessons');
                  setCurrentIndex(0);
                }}
              >
                ⬅ Back to Lessons
              </button>
              
              <button 
                type="button" 
                className="nav-btn hover-glow" 
                style={{ padding: '0.85rem 2rem', fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: 'var(--bg-primary)' }}
                onClick={() => {
                  setShowCompletionModal(false);
                  setQuizStates({}); // Reset all quiz states for clean play-again session
                  if (currentIndex === 0) {
                    const currentWord = wordsForLesson[0];
                    if (activity === 'spelling') {
                      initializeSpelling(currentWord.word);
                    } else if (activity === 'quiz') {
                      initializeQuiz(currentWord);
                    } else if (activity === 'flashcards') {
                      setIsFlipped(false);
                      speakWord(currentWord.word);
                    }
                  } else {
                    setCurrentIndex(0);
                  }
                }}
              >
                🔄 Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
