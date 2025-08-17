import { useState, useEffect } from 'react';

interface DashboardProps {
  userName?: string;
}

export default function Dashboard({ userName = "Kevin" }: DashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                🌅 Morning Routine
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {getGreeting()}, {userName}! Here's your daily overview.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
                {formatTime(currentTime)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          
          {/* Weather Widget */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                🌤️ Weather
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">San Francisco</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">72°F</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">Partly Cloudy</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                High: 78°F • Low: 65°F • Precipitation: 10%
              </div>
            </div>
          </div>

          {/* Financial Widget */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                💰 Markets
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">MSFT</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">$523.73</span>
                  <span className="text-xs text-green-600 ml-2">+1.2%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">BTC</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">$96,847</span>
                  <span className="text-xs text-red-600 ml-2">-2.3%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">NVDA</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">$875.12</span>
                  <span className="text-xs text-green-600 ml-2">+0.8%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Widget */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                📅 Today
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">3 events</span>
            </div>
            <div className="space-y-3">
              <div className="border-l-2 border-blue-500 pl-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Team Standup</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">9:00 AM</div>
              </div>
              <div className="border-l-2 border-green-500 pl-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Code Review</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">2:00 PM</div>
              </div>
              <div className="border-l-2 border-orange-500 pl-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Gym Session</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">6:00 PM</div>
              </div>
            </div>
          </div>

          {/* Todo Widget */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                ✅ Tasks
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">5 pending</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Review quarterly reports</span>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Update project timeline</span>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Call insurance company</span>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Book dentist appointment</span>
              </div>
            </div>
          </div>

        </div>

        {/* AI Chat Interface */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              🤖 AI Assistant
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Ask me anything about your morning routine, weather, schedule, or markets.
            </p>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                💬 <strong>AI:</strong> Good morning! I've gathered your daily briefing. Would you like me to explain anything in detail or help you plan your day?
              </div>
            </div>
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Send
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
