"use client";

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { AuthModal } from './auth/AuthModal';
import { signOut, getCurrentUser } from 'aws-amplify/auth';
import { savePicks } from '../../lib/dynamodb';
import { X } from 'lucide-react';
import { saveUserPicks, getUserPicks } from '../../lib/dynamodb';
import Link from 'next/link';

interface Game {
  id: string;
  weekNumber: string;
  away_team: string;
  home_team: string;
  commence_time: string;
  vegas_line: number;
  type?: 'regular' | 'playoff';
  message?: string;
}

interface GamesData {
  games: Game[];
  weeks: WeekInfo[];
  currentWeek: string;
}

interface WeekInfo {
  number: string;
  startDate: string;
  available: boolean;
}

interface Prediction {
  [gameId: string]: {
    team: string;
    line: string;
    locked?: boolean;
  };
}

interface GameSelection {
  gameId: string;
  team: string;
}
const GameTimeDisplay = ({ startTime }: { startTime: string }) => {
  const formattedTime = new Date(startTime).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  return (
    <div className="text-sm text-gray-600 mb-3">
      {formattedTime}
    </div>
  );
};

const SignUpPrompt = ({ onClose, onSignUpClick }: { onClose: () => void; onSignUpClick: () => void }) => (
  <div className="fixed bottom-4 right-4 mx-4 bg-white p-4 rounded-lg shadow-lg border-2 border-green-500 max-w-sm z-50 animate-slide-up">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="font-bold text-lg mb-1">Track Your Picks Week Over Week</h3>
        <p className="text-gray-600 text-sm mb-3">Create a free account to save your prediction history.</p>
        <button onClick={onSignUpClick} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Sign Up Free
        </button>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={20} />
      </button>
    </div>
  </div>
);

const FieldBackground = () => (
  <div className="absolute top-0 left-0 w-full h-48 sm:h-56 md:h-64 bg-green-700 overflow-hidden">
    <div className="relative w-full h-full">
      <div className="absolute inset-0 flex justify-between px-4">
        {[...Array(11)].map((_, i) => (
          <div key={i} className="h-full w-1 bg-white opacity-40" />
        ))}
      </div>
      <div className="absolute left-1/2 top-0 h-full w-2 bg-white opacity-60" />
    </div>
  </div>
);

const CelebrationOverlay = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const interval = setInterval(() => {
      if (Date.now() > animationEnd) {
        clearInterval(interval);
        onComplete();
        return;
      }
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#62A87C', '#7CBA94', '#96CCAC']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#62A87C', '#7CBA94', '#96CCAC']
      });
    }, 250);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-white animate-celebration">
        GOOD JOB BY YOU!
      </div>
    </div>
  );
};
const WeekSelector = ({ 
  weeks, 
  selectedWeek, 
  onSelect, 
  currentWeek, 
  user 
}: { 
  weeks: string[], 
  selectedWeek: string, 
  onSelect: (week: string) => void, 
  currentWeek: string,
  user: any
}) => {
  const currentDate = new Date();
  const currentTimestamp = currentDate.getTime();
  
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {weeks.map((week) => {
        const weekStartDate = new Date(); // This should come from your data
        const isPastWeek = weekStartDate.getTime() < currentTimestamp;
        
        if (isPastWeek && !user) return null; // Hide past weeks for non-logged-in users
        
        return (
          <button
            key={week}
            onClick={() => onSelect(week)}
            className={`
              px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold 
              transition-colors text-sm sm:text-base 
              ${selectedWeek === week
                ? 'bg-green-600 text-white'
                : isPastWeek
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-gray-50 text-gray-700 hover:bg-green-50'
              }
            `}
            disabled={isPastWeek && !user}
          >
            {isNaN(parseInt(week)) ? String(week).toUpperCase() : `Week ${week}`}
          </button>
        );
      })}
    </div>
  );
};

const LineInput = ({ 
  value, 
  onChange, 
  onSubmit,
  onBlur
}: { 
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBlur: () => void;
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[+-]?\d*\.?\d*$/.test(value)) {
      onChange(value);
    }
  };

  const handleInputBlur = () => {
    if (value) {
      let num = parseFloat(value);
      if (!isNaN(num)) {
        num = Math.round(num * 2) / 2;
        const sign = value.startsWith('+') ? '+' : '';
        onChange(sign + num.toFixed(1));
      }
    }
    onBlur();
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleInputBlur}
      className="w-20 sm:w-24 p-2 border-2 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center font-bold text-sm sm:text-base"
      placeholder="+/- spread"
      autoFocus
    />
  );
};

const PredictionDisplay = ({ 
  game,
  prediction,
  isSelected,
  submitted,
  onUpdate,
  onConfirm
}: {
  game: Game;
  prediction?: { team: string; line: string };
  isSelected: boolean;
  submitted: boolean;
  onUpdate: (fn: (prev: any) => any) => void;
  onConfirm: () => void;
}) => {
  const formatLine = (line: number | string) => {
    const numLine = typeof line === 'string' ? parseFloat(line) : line;
    return numLine > 0 ? `+${numLine}` : numLine;
  };

  if (isSelected && !submitted) {
    return (
      <LineInput
        value={prediction?.line || ''}
        onChange={(value) => {
          onUpdate(prev => ({
            ...prev,
            [game.id]: { 
              ...prev[game.id],
              line: value
            }
          }));
        }}
        onSubmit={onConfirm}
        onBlur={() => {
          if (prediction?.line) {
            let num = parseFloat(prediction.line);
            if (!isNaN(num)) {
              num = Math.round(num * 2) / 2;
              const sign = prediction.line.startsWith('+') ? '+' : '';
              onUpdate(prev => ({
                ...prev,
                [game.id]: {
                  ...prev[game.id],
                  line: sign + num.toFixed(1),
                  locked: true
                }
              }));
            }
          }
          onConfirm();
        }}
      />
    );
  }

  if (!prediction) {
    return <div className="min-w-[120px]" />;
  }

  return (
    <div className="text-center space-y-2 min-w-[120px]">
      <div className="font-bold text-lg">
        {prediction.team} {formatLine(prediction.line)}
      </div>
      {submitted && (
        <div className="text-gray-600">
          {prediction.team} {formatLine(prediction.team === game.home_team ? game.vegas_line : -game.vegas_line)}
        </div>
      )}
    </div>
  );
};
const GameCard = ({ 
  game, 
  prediction, 
  isSelected, 
  submitted, 
  onTeamClick, 
  onPredictionUpdate, 
  onPredictionConfirm 
}: {
  game: Game;
  prediction?: { team: string; line: string };
  isSelected: boolean;
  submitted: boolean;
  onTeamClick: (gameId: string, team: string) => void;
  onPredictionUpdate: (fn: (prev: any) => any) => void;
  onPredictionConfirm: () => void;
}) => (
  <div className="bg-white rounded-lg shadow p-3 sm:p-6">
    <div className="font-bold text-base sm:text-lg mb-2">
      {game.type === 'playoff' ? String(game.weekNumber).toUpperCase() : `Week ${game.weekNumber}`}
    </div>
    <GameTimeDisplay startTime={game.commence_time} />
    {game.type === 'playoff' ? (
      <div className="text-lg sm:text-xl italic text-gray-600 py-6 sm:py-8 text-center">
        {game.message}
        <div className="text-xs sm:text-sm mt-3 sm:mt-4 font-normal">- Jim Mora</div>
      </div>
    ) : (
      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1 flex items-center justify-center sm:justify-end w-full sm:w-auto">
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-xs text-gray-500 mb-1">Away Team</span>
            <button
              onClick={() => onTeamClick(game.id, game.away_team)}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base
                ${isSelected && prediction?.team === game.away_team
                  ? 'bg-green-100 border-2 border-green-500 shadow-md transform scale-105'
                  : prediction?.team === game.away_team
                  ? 'bg-gray-50 border-2 border-gray-300 shadow-sm'
                  : 'hover:bg-gray-50 border-2 border-gray-200 shadow hover:shadow-md hover:border-gray-300'
                } cursor-pointer active:transform active:scale-95 min-w-[100px] sm:min-w-[140px]`}
              disabled={submitted}
            >
              {game.away_team}
            </button>
          </div>
        </div>
        
        <PredictionDisplay
          game={game}
          prediction={prediction}
          isSelected={isSelected}
          submitted={submitted}
          onUpdate={onPredictionUpdate}
          onConfirm={onPredictionConfirm}
        />
        
        <div className="flex-1 flex items-center justify-center sm:justify-start w-full sm:w-auto">
          <div className="flex flex-col items-center sm:items-start">
            <span className="text-xs text-gray-500 mb-1">Home Team</span>
            <button
              onClick={() => onTeamClick(game.id, game.home_team)}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base
                ${isSelected && prediction?.team === game.home_team
                  ? 'bg-green-100 border-2 border-green-500 shadow-md transform scale-105'
                  : prediction?.team === game.home_team
                  ? 'bg-gray-50 border-2 border-gray-300 shadow-sm'
                  : 'hover:bg-gray-50 border-2 border-gray-200 shadow hover:shadow-md hover:border-gray-300'
                } cursor-pointer active:transform active:scale-95 min-w-[100px] sm:min-w-[140px]`}
              disabled={submitted}
            >
              {game.home_team}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
export default function GuessTheLines() {
  const [gamesData, setGamesData] = useState<GamesData>({
    games: [],
    weeks: [],
    currentWeek: ''
  });
  const [user, setUser] = useState<any>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('8');
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<Prediction>({});
  const [selectedGame, setSelectedGame] = useState<GameSelection | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch('/api/odds');
        if (!response.ok) throw new Error('Failed to fetch games');
        const data = await response.json();
        setGamesData(data);
        setSelectedWeek(data.currentWeek);
      } catch (error) {
        console.error('Error fetching games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        console.log('Current user:', currentUser);
        setUser(currentUser);
        if (currentUser) {
          const userPicks = await getUserPicks(currentUser.userId);
          console.log('User picks loaded:', userPicks);
        }
      } catch (err) {
        setUser(null);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    if (submitted && !user && !showAuthModal) {
      const timer = setTimeout(() => {
        setShowSignUpPrompt(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowSignUpPrompt(false);
    }
  }, [submitted, user, showAuthModal]);

  const handleTeamClick = (gameId: string, team: string) => {
    if (submitted || predictions[gameId]?.locked) return;
    setSelectedGame({ gameId, team });
    setPredictions(prev => ({
      ...prev,
      [gameId]: {
        team,
        line: prev[gameId]?.line || '',
        locked: false
      }
    }));
  };

  const sortGamesByStartTime = (games: Game[]) => {
    return [...games].sort((a, b) => 
      new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
    );
  };

  // In your GuessTheLines.tsx, update the handleSubmit function

const handleSubmit = async () => {
  setSubmitted(true);
  setShowCelebration(true);
  setSelectedGame(null);

  if (!user?.userId) {
    setSaveMessage({ type: 'error', text: 'Please log in to save picks' });
    return;
  }

  try {
    console.log('Starting save with:', {
      predictions,
      user,
      selectedWeek,
      gamesData
    });

    // Validate predictions
    if (!predictions || Object.keys(predictions).length === 0) {
      throw new Error('No predictions to save');
    }

    // Validate games data
    if (!gamesData?.games) {
      throw new Error('Games data not available');
    }

    // Format picks
    const picksToSave = Object.entries(predictions).map(([gameId, prediction]) => {
      const game = gamesData.games.find(g => g.id === gameId);
      if (!game) {
        throw new Error(`Game not found: ${gameId}`);
      }

      return {
        userId: user.userId,
        gameId,
        team: prediction.team,
        predictedLine: prediction.line,
        actualLine: game.vegas_line,
        week: selectedWeek,
        timestamp: new Date().toISOString()
      };
    });

    console.log('Picks formatted for save:', picksToSave);

    // Save picks
    const result = await saveUserPicks(user.userId, selectedWeek, picksToSave);
    
    if (result.success) {
      setSaveMessage({ type: 'success', text: 'Picks saved successfully!' });
    } else {
      throw new Error('Failed to save picks');
    }
  } catch (error) {
    console.error('Error saving picks:', {
      error,
      predictions,
      user,
      selectedWeek,
      gamesDataExists: !!gamesData,
      gamesExist: !!gamesData?.games
    });
    setSaveMessage({ 
      type: 'error', 
      text: error instanceof Error ? error.message : 'Failed to save picks. Please try again.' 
    });
  }
};
  const resetPredictions = () => {
    setPredictions({});
    setSubmitted(false);
    setSelectedGame(null);
    setShowSignUpPrompt(false);
    setSaveMessage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  const filteredGames = sortGamesByStartTime(
    gamesData.games.filter(game => game.weekNumber === selectedWeek)
  );

  const availableWeeks = gamesData.weeks
    .filter(week => {
      const weekGames = gamesData.games.filter(game => game.weekNumber === week.number);
      const earliestGame = weekGames.reduce((earliest, game) => {
        const gameTime = new Date(game.commence_time).getTime();
        return !earliest || gameTime < earliest ? gameTime : earliest;
      }, 0);
      
      return !earliestGame || earliestGame >= Date.now() || user;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .map(week => week.number);

  return (
    <div className="min-h-screen bg-gray-100">
      {showCelebration && <CelebrationOverlay onComplete={() => setShowCelebration(false)} />}
      {showSignUpPrompt && (
        <SignUpPrompt
          onClose={() => setShowSignUpPrompt(false)}
          onSignUpClick={() => {
            setShowSignUpPrompt(false);
            setShowAuthModal(true);
          }}
        />
      )}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} initialMode="signup" />}
      <div className="relative overflow-hidden">
        <FieldBackground />
        
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-30">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <Link 
                href="picks/history"
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-green-600 rounded-lg hover:bg-gray-100 text-sm sm:text-base"
              >
                View History
              </Link>
              <span className="text-white text-sm sm:text-base">
                {user.email || user.signInDetails?.loginId || 'User'}
              </span>
              <button 
                onClick={() => signOut()}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-green-600 rounded-lg hover:bg-gray-100 text-sm sm:text-base"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-green-600 rounded-lg hover:bg-gray-100 text-sm sm:text-base"
            >
              Sign In
            </button>
          )}
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-8 sm:pt-12 pb-12 sm:pb-16 text-center">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white mb-4 sm:mb-6 drop-shadow-lg">
            Guess The Lines
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl text-white font-medium max-w-2xl mx-auto leading-relaxed">
            The Easiest Way to Play Along With Bill and Sal
          </p>
        </div>

        <div className="relative z-20 max-w-4xl mx-auto px-2 sm:px-4 pb-8 sm:pb-12">
          <div className="bg-white rounded-lg shadow-lg mb-6 sm:mb-8 p-4">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-center">Select Week</h2>
            <WeekSelector 
              weeks={availableWeeks}
              selectedWeek={selectedWeek}
              onSelect={(week) => {
                setSelectedWeek(week);
                resetPredictions();
              }}
              currentWeek={gamesData.currentWeek}
              user={user}
            />
          </div>

          <div className="space-y-3 sm:space-y-4">
            {filteredGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                prediction={predictions[game.id]}
                isSelected={selectedGame?.gameId === game.id}
                submitted={submitted}
                onTeamClick={handleTeamClick}
                onPredictionUpdate={setPredictions}
                onPredictionConfirm={() => setSelectedGame(null)}
              />
            ))}
          </div>

          {filteredGames.length > 0 && filteredGames[0].type !== 'playoff' && (
            <div className="flex justify-center pt-6">
              <button
                onClick={submitted ? resetPredictions : handleSubmit}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg text-base sm:text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
              >
                {submitted ? 'Make New Predictions' : 'Submit Predictions'}
              </button>
            </div>
          )}

          {saveMessage && (
            <div className={`mt-4 p-2 rounded text-sm sm:text-base ${
              saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {saveMessage.text}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes celebration {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-celebration {
          animation: celebration 1s ease-out forwards;
          text-shadow: 0 0 20px rgba(34, 197, 94, 0.8);
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}