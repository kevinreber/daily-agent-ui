import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  apiClient,
  type WeatherData,
  type FinancialData,
  type CalendarData,
  type TodoData,
} from "../lib/api";
import Clock from "./Clock";

interface DashboardProps {
  userName?: string;
  // Server-side loaded data (no CORS issues!)
  initialWeather?: WeatherData | null;
  initialFinancial?: FinancialData | null;
  initialCalendar?: CalendarData | null;
  initialTodos?: TodoData | null;
  serverErrors?: {
    weather?: string | null;
    financial?: string | null;
    calendar?: string | null;
    todos?: string | null;
  };
}

export default function Dashboard({
  userName = "Kevin",
  initialWeather,
  initialFinancial,
  initialCalendar,
  initialTodos,
  serverErrors,
}: DashboardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(
    initialWeather || null
  );
  const [financial, setFinancial] = useState<FinancialData | null>(
    initialFinancial || null
  );
  const [calendar, setCalendar] = useState<CalendarData | null>(
    initialCalendar || null
  );
  const [todos, setTodos] = useState<TodoData | null>(initialTodos || null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ type: "user" | "ai"; message: string; timestamp: string }>
  >([]);
  const [sessionId, setSessionId] = useState<string | null>(null); // Track conversation session
  const [loading, setLoading] = useState(
    !initialWeather && !initialFinancial && !initialCalendar && !initialTodos
  );
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Slash command registry
  const slashCommands = [
    {
      command: "/summary",
      aliases: ["/briefing"],
      description: "Get your daily morning briefing",
      icon: "📊",
      action:
        "Give me a comprehensive morning briefing with weather, finance, calendar, and tasks",
    },
    {
      command: "/weather",
      aliases: ["/forecast"],
      description: "Get current weather information",
      icon: "🌤️",
      action: "What's the current weather and forecast?",
    },
    {
      command: "/finance",
      aliases: ["/stocks", "/market"],
      description: "Check your financial portfolio",
      icon: "💰",
      action: "How are my stocks and crypto investments doing?",
    },
    {
      command: "/calendar",
      aliases: ["/schedule", "/events"],
      description: "View today's calendar events",
      icon: "📅",
      action: "What events do I have scheduled for today?",
    },
    {
      command: "/tasks",
      aliases: ["/todos", "/todo"],
      description: "Show your task list",
      icon: "✅",
      action: "What tasks do I have to complete today?",
    },
    {
      command: "/commute",
      aliases: ["/traffic"],
      description: "Check traffic and commute info",
      icon: "🚗",
      action: "How does traffic to work look right now?",
    },
    {
      command: "/help",
      aliases: ["/commands"],
      description: "Show available slash commands",
      icon: "❓",
      action: "help", // Special case - handled locally
    },
  ];

  const [collapsedWidgets, setCollapsedWidgets] = useState<
    Record<string, boolean>
  >(() => {
    // On mobile, collapse some widgets by default for better UX
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    return {
      weather: false,
      financial: isMobile,
      calendar: isMobile,
      todos: isMobile,
      chat: false, // Chat starts expanded
    };
  });
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      const scrollElement = chatContainerRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [chatHistory]);

  // Process slash commands
  const processSlashCommand = (input: string): string | null => {
    const trimmedInput = input.trim();
    if (!trimmedInput.startsWith("/")) return null;

    const commandPart = trimmedInput.split(" ")[0].toLowerCase();

    // Find matching command
    const matchedCommand = slashCommands.find(
      (cmd) => cmd.command === commandPart || cmd.aliases.includes(commandPart)
    );

    if (!matchedCommand) return null;

    // Handle special commands locally
    if (matchedCommand.action === "help") {
      const helpMessage = `**Available Slash Commands:**\n\n${slashCommands
        .filter((cmd) => cmd.action !== "help")
        .map(
          (cmd) =>
            `${cmd.icon} **${cmd.command}** ${cmd.aliases.length > 0 ? `(${cmd.aliases.join(", ")})` : ""}\n${cmd.description}`
        )
        .join("\n\n")}`;

      setChatHistory((prev) => [
        ...prev,
        {
          type: "ai",
          message: helpMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
      return "help_processed";
    }

    return matchedCommand.action;
  };

  // Get filtered command suggestions
  const getCommandSuggestions = (input: string) => {
    if (!input.startsWith("/") || input.includes(" ")) return [];

    const searchTerm = input.toLowerCase();
    return slashCommands.filter(
      (cmd) =>
        cmd.command.startsWith(searchTerm) ||
        cmd.aliases.some((alias) => alias.startsWith(searchTerm))
    );
  };

  // Send chat message to proxy API (no CORS issues!)
  const sendChatMessage = async (message: string) => {
    try {
      // Prepare request body with session_id if available
      const requestBody: { message: string; session_id?: string } = { message };
      if (sessionId) {
        requestBody.session_id = sessionId;
      }

      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        // Store session_id for future messages
        if (data.session_id && (!sessionId || data.new_session)) {
          setSessionId(data.session_id);
          console.log(
            `💬 Session ${data.new_session ? "created" : "updated"}: ${data.session_id}`
          );
        }

        // Add AI response to history
        setChatHistory((prev) => [
          ...prev,
          {
            type: "ai",
            message: data.response,
            timestamp: data.timestamp,
          },
        ]);
      } else {
        // Add error message as AI response
        setChatHistory((prev) => [
          ...prev,
          {
            type: "ai",
            message: data.error || "Something went wrong",
            timestamp: data.timestamp || new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          type: "ai",
          message:
            "Sorry, I'm having trouble connecting to the AI service right now. Please try again later.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const toggleWidget = (widgetName: string) => {
    setCollapsedWidgets((prev) => ({
      ...prev,
      [widgetName]: !prev[widgetName],
    }));
  };

  // Fetch missing data on component mount (server-side data takes priority)
  useEffect(() => {
    const fetchMissingData = async () => {
      // Only fetch data that wasn't loaded server-side
      const needsClientFetch =
        !initialWeather ||
        !initialFinancial ||
        !initialCalendar ||
        !initialTodos;

      if (!needsClientFetch) {
        console.log("✅ Using server-side loaded data, skipping client fetch");
        setLoading(false);
        // Add initial AI greeting
        setChatHistory([
          {
            type: "ai",
            message:
              "Good morning! I've gathered your daily briefing. Would you like me to explain anything in detail or help you plan your day?",
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

      console.log(
        "🔄 Some data missing from server-side load, fetching client-side..."
      );
      setLoading(true);

      try {
        // Fetch only missing data individually to avoid type issues
        if (!initialWeather) {
          const weatherData = await apiClient.getWeather();
          setWeather(weatherData);
        }

        if (!initialFinancial) {
          const financialData = await apiClient.getFinancialData();
          setFinancial(financialData);
        }

        if (!initialCalendar) {
          const calendarData = await apiClient.getCalendar();
          setCalendar(calendarData);
        }

        if (!initialTodos) {
          const todoData = await apiClient.getTodos();
          setTodos(todoData);
        }

        // Add initial AI greeting
        setChatHistory([
          {
            type: "ai",
            message:
              "Good morning! I've gathered your daily briefing. Would you like me to explain anything in detail or help you plan your day?",
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch (error) {
        console.error("Error fetching missing dashboard data:", error);
        // Display server errors if available
        if (serverErrors) {
          console.log("Server-side fetch errors:", serverErrors);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMissingData();
  }, [
    initialWeather,
    initialFinancial,
    initialCalendar,
    initialTodos,
    serverErrors,
  ]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isLoadingChat) return;

    const userInput = chatMessage.trim();
    setChatMessage("");
    setShowCommandSuggestions(false);

    // Check if it's a slash command
    const commandResult = processSlashCommand(userInput);

    if (commandResult === "help_processed") {
      // Help command was processed locally, no need to send to AI
      return;
    }

    // For slash commands, send the actual command, not the translated action
    const userMessage = userInput; // Always send what the user actually typed
    setIsLoadingChat(true);

    // Add user message to history immediately (show original input, not translated command)
    setChatHistory((prev) => [
      ...prev,
      {
        type: "user",
        message: userInput,
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      await sendChatMessage(userMessage);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      showCommandSuggestions &&
      chatMessage.startsWith("/") &&
      !chatMessage.includes(" ")
    ) {
      const suggestions = getCommandSuggestions(chatMessage);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }

      if (e.key === "Tab" || (e.key === "Enter" && suggestions.length > 0)) {
        e.preventDefault();
        const selectedCommand = suggestions[selectedCommandIndex];
        if (selectedCommand) {
          setChatMessage(selectedCommand.command + " ");
          setShowCommandSuggestions(false);
          setSelectedCommandIndex(0);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setShowCommandSuggestions(false);
        setSelectedCommandIndex(0);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header - Sticky and Mobile Optimized */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="min-w-0 flex-1 flex items-center space-x-2 sm:space-x-3">
              <img
                src="/logo_100x100_fullheight.png"
                alt="Daily Agent Logo"
                className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  <span className="hidden sm:inline">Daily Agent</span>
                  <span className="sm:hidden">Daily Agent</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                  {getGreeting()}, {userName}! Here's your daily overview.
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 sm:hidden">
                  {getGreeting()}, {userName}!
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => {
                  const allCollapsed = Object.values(collapsedWidgets).every(
                    (collapsed) => collapsed
                  );
                  setCollapsedWidgets({
                    weather: !allCollapsed,
                    financial: !allCollapsed,
                    calendar: !allCollapsed,
                    todos: !allCollapsed,
                    chat: !allCollapsed,
                  });
                }}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full transition-colors"
              >
                <span className="hidden sm:inline">
                  {Object.values(collapsedWidgets).every(
                    (collapsed) => collapsed
                  )
                    ? "Expand All"
                    : "Collapse All"}
                </span>
                <span className="sm:hidden">
                  {Object.values(collapsedWidgets).every(
                    (collapsed) => collapsed
                  )
                    ? "↕️"
                    : "⬇️"}
                </span>
              </button>
              <Clock userName={userName} className="font-mono" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4 pb-20">
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {/* Weather Widget */}
          <div
            className={`col-span-1 md:col-span-2 lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all ${collapsedWidgets.weather ? "p-3" : "p-4 sm:p-6"}`}
          >
            <div
              className={`flex items-center justify-between ${collapsedWidgets.weather ? "mb-0" : "mb-4"}`}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                🌤️ Weather
                {collapsedWidgets.weather && weather && (
                  <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                    {weather.data.current_temp}°F, {weather.data.condition}
                  </span>
                )}
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {weather?.data?.location || "Loading..."}
                </span>
                <button
                  onClick={() => toggleWidget("weather")}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  aria-label={
                    collapsedWidgets.weather
                      ? "Expand weather"
                      : "Collapse weather"
                  }
                >
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${collapsedWidgets.weather ? "" : "rotate-180"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {!collapsedWidgets.weather && (
              <>
                {loading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  </div>
                ) : weather ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {weather.data.current_temp}°F
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {weather.data.condition}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      High: {weather.data.temp_hi}°F • Low:{" "}
                      {weather.data.temp_lo}°F • Precipitation:{" "}
                      {weather.data.precip_chance}%
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-500">
                    Failed to load weather data
                  </div>
                )}
              </>
            )}
          </div>

          {/* Financial Widget */}
          <div
            className={`col-span-1 md:col-span-2 lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all ${collapsedWidgets.financial ? "p-3" : "p-4 sm:p-6"}`}
          >
            <div
              className={`flex items-center justify-between ${collapsedWidgets.financial ? "mb-0" : "mb-4"}`}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                💰 Markets
                {collapsedWidgets.financial && financial?.data?.data && (
                  <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                    {financial.data.data.length} stocks
                  </span>
                )}
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {financial?.data?.market_status || "Loading..."}
                </span>
                <button
                  onClick={() => toggleWidget("financial")}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  aria-label={
                    collapsedWidgets.financial
                      ? "Expand markets"
                      : "Collapse markets"
                  }
                >
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${collapsedWidgets.financial ? "" : "rotate-180"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {!collapsedWidgets.financial && (
              <>
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center"
                      >
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                        <div className="text-right space-y-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : financial?.data?.data ? (
                  <div className="space-y-2">
                    {financial.data.data.slice(0, 3).map((item) => (
                      <div
                        key={item.symbol}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {item.symbol}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            $
                            {item.price.toLocaleString(undefined, {
                              minimumFractionDigits:
                                item.data_type === "crypto" && item.price > 1000
                                  ? 0
                                  : 2,
                              maximumFractionDigits:
                                item.data_type === "crypto" && item.price > 1000
                                  ? 0
                                  : 2,
                            })}
                          </span>
                          <span
                            className={`text-xs ml-2 ${
                              item.change_percent >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {item.change_percent >= 0 ? "+" : ""}
                            {item.change_percent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-red-500">
                    Failed to load financial data
                  </div>
                )}
              </>
            )}
          </div>

          {/* Calendar Widget */}
          <div
            className={`col-span-1 md:col-span-1 lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all ${collapsedWidgets.calendar ? "p-3" : "p-4 sm:p-6"}`}
          >
            <div
              className={`flex items-center justify-between ${collapsedWidgets.calendar ? "mb-0" : "mb-4"}`}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                📅 Today
                {collapsedWidgets.calendar &&
                  calendar?.data?.total_events !== undefined && (
                    <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                      {calendar.data.total_events} events
                    </span>
                  )}
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {calendar?.data?.total_events
                    ? `${calendar.data.total_events} events`
                    : "Loading..."}
                </span>
                <button
                  onClick={() => toggleWidget("calendar")}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  aria-label={
                    collapsedWidgets.calendar
                      ? "Expand calendar"
                      : "Collapse calendar"
                  }
                >
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${collapsedWidgets.calendar ? "" : "rotate-180"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {!collapsedWidgets.calendar && (
              <>
                {loading ? (
                  <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border-l-2 border-gray-300 pl-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                ) : calendar?.data?.events ? (
                  <div className="space-y-3">
                    {calendar.data.events.map((event, index) => {
                      const colorMap: Record<string, string> = {
                        blue: "border-blue-500",
                        green: "border-green-500",
                        orange: "border-orange-500",
                        red: "border-red-500",
                        purple: "border-purple-500",
                      };
                      return (
                        <div
                          key={index}
                          className={`border-l-2 ${colorMap[event.color] || "border-gray-500"} pl-3`}
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {event.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {event.time}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-red-500">
                    Failed to load calendar data
                  </div>
                )}
              </>
            )}
          </div>

          {/* Todo Widget */}
          <div
            className={`col-span-1 md:col-span-1 lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all ${collapsedWidgets.todos ? "p-3" : "p-4 sm:p-6"}`}
          >
            <div
              className={`flex items-center justify-between ${collapsedWidgets.todos ? "mb-0" : "mb-4"}`}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                ✅ Tasks
                {collapsedWidgets.todos &&
                  todos?.data?.total_pending !== undefined && (
                    <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                      {todos.data.total_pending} pending
                    </span>
                  )}
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {todos?.data?.total_pending
                    ? `${todos.data.total_pending} pending`
                    : "Loading..."}
                </span>
                <button
                  onClick={() => toggleWidget("todos")}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  aria-label={
                    collapsedWidgets.todos ? "Expand tasks" : "Collapse tasks"
                  }
                >
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${collapsedWidgets.todos ? "" : "rotate-180"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {!collapsedWidgets.todos && (
              <>
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                      </div>
                    ))}
                  </div>
                ) : todos?.data?.items ? (
                  <div className="space-y-2">
                    {todos.data.items.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={item.completed}
                          onChange={() => {
                            // In a real app, this would update the todo via API
                            console.log("Toggle todo:", item.id);
                          }}
                        />
                        <span
                          className={`text-sm ${item.completed ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300"}`}
                        >
                          {item.text}
                        </span>
                        {item.priority === "high" && (
                          <span className="text-xs text-red-500 font-medium">
                            !
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-red-500">
                    Failed to load todo data
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Chat Overlay - Creates depth effect behind chat */}
        {!collapsedWidgets.chat && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300 ease-in-out"
            onClick={() =>
              setCollapsedWidgets((prev) => ({ ...prev, chat: true }))
            }
            aria-label="Close chat overlay"
          />
        )}

        {/* AI Chat Interface - Bottom Anchored */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl backdrop-blur-sm rounded-t-xl lg:rounded-t-none transition-all duration-300 ease-in-out">
          <div className="max-w-7xl mx-auto">
            <div
              className={`flex flex-col transition-all duration-300 ease-in-out ${collapsedWidgets.chat ? "h-auto" : "max-h-[calc(100vh-120px)] lg:max-h-[calc(100vh-200px)] min-h-[200px]"}`}
            >
              {/* Collapsible Header */}
              <div
                className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                onClick={() =>
                  setCollapsedWidgets((prev) => ({ ...prev, chat: !prev.chat }))
                }
              >
                {/* Mobile drag handle */}
                <div className="flex justify-center mb-2 lg:hidden">
                  <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full transition-colors duration-200"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                      🤖 AI Assistant
                    </h2>
                    {sessionId && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Memory Active
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {sessionId && !collapsedWidgets.chat && (
                      <button
                        onClick={() => {
                          setSessionId(null);
                          setChatHistory([
                            {
                              type: "ai",
                              message:
                                "Conversation memory cleared. Starting fresh!",
                              timestamp: new Date().toISOString(),
                            },
                          ]);
                          console.log("💬 Session cleared");
                        }}
                        className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded transition-colors"
                        title="Clear conversation memory"
                      >
                        Clear
                      </button>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform duration-300 ease-in-out ${collapsedWidgets.chat ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              {/* Messages Area - Only show when not collapsed */}
              <div
                className={`flex flex-col flex-1 min-h-0 transition-all duration-300 ease-in-out overflow-hidden ${collapsedWidgets.chat ? "max-h-0 opacity-0" : "max-h-[calc(100vh-200px)] lg:max-h-[calc(100vh-280px)] opacity-100"}`}
              >
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-3 space-y-2"
                >
                  {/* Show existing messages first */}
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`${
                        message.type === "user"
                          ? "ml-6 bg-blue-500 text-white"
                          : "mr-6 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      } rounded-lg p-3 text-sm`}
                    >
                      {message.type === "user" &&
                      message.message.startsWith("/") ? (
                        // Special rendering for slash commands
                        <div>
                          {(() => {
                            const messageText = message.message;
                            const spaceIndex = messageText.indexOf(" ");

                            if (spaceIndex === -1) {
                              // Just the command, no additional text
                              return (
                                <span className="font-bold text-yellow-200 bg-blue-700/50 px-1 rounded">
                                  {messageText}
                                </span>
                              );
                            } else {
                              // Command + additional text
                              const command = messageText.substring(
                                0,
                                spaceIndex
                              );
                              const rest = messageText.substring(spaceIndex);
                              return (
                                <>
                                  <span className="font-bold text-yellow-200 bg-blue-700/50 px-1 rounded">
                                    {command}
                                  </span>
                                  <span className="text-white/90">{rest}</span>
                                </>
                              );
                            }
                          })()}
                        </div>
                      ) : (
                        // Regular markdown rendering for non-slash-command messages
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc pl-4 mb-2">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal pl-4 mb-2">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="mb-1">{children}</li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold">
                                {children}
                              </strong>
                            ),
                            code: ({ children }) => (
                              <code className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-xs">
                                {children}
                              </code>
                            ),
                          }}
                        >
                          {message.message}
                        </ReactMarkdown>
                      )}
                    </div>
                  ))}

                  {/* Loading indicator when AI is thinking */}
                  {isLoadingChat && (
                    <div className="mr-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-300 animate-pulse">
                        AI is thinking...
                      </span>
                    </div>
                  )}

                  {/* Show prompts if there are 1 or fewer messages (just initial greeting or empty) */}
                  {chatHistory.length <= 1 && (
                    <div className="p-3 space-y-4">
                      {chatHistory.length === 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          Start a conversation with your AI assistant...
                        </div>
                      )}

                      {/* Quick Prompt Buttons */}
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { text: "/summary", icon: "📊", isCommand: true },
                          { text: "/weather", icon: "🌤️", isCommand: true },
                          { text: "/finance", icon: "💰", isCommand: true },
                          { text: "How does my day look?", icon: "📅" },
                          { text: "What tasks do I have today?", icon: "✅" },
                          { text: "/help", icon: "❓", isCommand: true },
                        ].map((prompt, index) => (
                          <button
                            key={index}
                            onClick={async () => {
                              if (isLoadingChat) return;

                              const userMessage = prompt.text;
                              setIsLoadingChat(true);

                              // Add user message to history immediately
                              setChatHistory((prev) => [
                                ...prev,
                                {
                                  type: "user",
                                  message: userMessage,
                                  timestamp: new Date().toISOString(),
                                },
                              ]);

                              try {
                                await sendChatMessage(userMessage);
                              } finally {
                                setIsLoadingChat(false);
                              }
                            }}
                            disabled={isLoadingChat}
                            className={`flex items-center space-x-2 p-3 text-sm text-left rounded-lg border transition-colors duration-200 group disabled:opacity-50 disabled:cursor-not-allowed ${
                              prompt.isCommand
                                ? "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800"
                                : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600"
                            }`}
                          >
                            <span className="text-base">
                              {isLoadingChat ? (
                                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                prompt.icon
                              )}
                            </span>
                            <div className="flex items-center justify-between flex-1">
                              <span
                                className={`${
                                  prompt.isCommand
                                    ? "text-blue-700 dark:text-blue-300 group-hover:text-blue-900 dark:group-hover:text-blue-100"
                                    : "text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white"
                                }`}
                              >
                                {prompt.text}
                              </span>
                              {prompt.isCommand && (
                                <span className="text-xs text-blue-500 dark:text-blue-400 font-mono">
                                  CMD
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
                        Try slash commands above, or type your own message below
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Input Area - Always visible */}
              <div className="relative border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                {/* Command Suggestions - Floating above input */}
                {showCommandSuggestions &&
                  chatMessage.startsWith("/") &&
                  !chatMessage.includes(" ") && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 z-10">
                      <div className="mx-3 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-lg shadow-lg">
                        <div className="px-3 py-1 border-b border-gray-200/60 dark:border-gray-700/60">
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                            <span>Commands</span>
                            <span>↑↓ navigate • ↵ select • esc close</span>
                          </div>
                        </div>
                        <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                          {getCommandSuggestions(chatMessage).map(
                            (cmd, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setChatMessage(cmd.command + " ");
                                  setShowCommandSuggestions(false);
                                  setSelectedCommandIndex(0);
                                }}
                                className={`w-full flex items-center space-x-2 p-2 text-left rounded-md transition-colors text-sm group ${
                                  index === selectedCommandIndex
                                    ? "bg-blue-100/80 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100"
                                    : "hover:bg-gray-100/80 dark:hover:bg-gray-700/80"
                                }`}
                              >
                                <span className="text-sm">{cmd.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                                    {cmd.command}
                                    {cmd.aliases.length > 0 && (
                                      <span className="text-gray-500 dark:text-gray-400 font-normal text-xs ml-1">
                                        ({cmd.aliases.join(", ")})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                    {cmd.description}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                  ↵
                                </div>
                              </button>
                            )
                          )}
                          {getCommandSuggestions(chatMessage).length === 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                              No commands found. Try{" "}
                              <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">
                                /help
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type your message or / for commands..."
                    value={chatMessage}
                    onChange={(e) => {
                      const value = e.target.value;
                      setChatMessage(value);

                      // Show command suggestions only when actively typing a command (no space yet)
                      if (
                        value.startsWith("/") &&
                        value.length > 0 &&
                        !value.includes(" ")
                      ) {
                        setShowCommandSuggestions(true);
                        setSelectedCommandIndex(0); // Reset selection
                      } else {
                        setShowCommandSuggestions(false);
                        setSelectedCommandIndex(0);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={isLoadingChat}
                    className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-all text-sm ${
                      chatMessage.startsWith("/")
                        ? "text-blue-600 dark:text-blue-300 font-medium border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
                        : ""
                    }`}
                    autoComplete="off"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoadingChat || !chatMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isLoadingChat ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
