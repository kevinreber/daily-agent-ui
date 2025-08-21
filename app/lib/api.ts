// API client for communicating with the AI Agent
export class AIAgentAPI {
  private baseURL: string;

  constructor() {
    // Use environment variable if set, otherwise default to localhost
    this.baseURL =
      import.meta.env?.VITE_AI_AGENT_API_URL || "http://localhost:8001";

    if (import.meta.env?.VITE_DEBUG === "true") {
      console.log(`🔗 AI Agent API URL: ${this.baseURL}`);
      console.log(`🌍 Environment: ${import.meta.env?.VITE_ENVIRONMENT}`);
    }
  }

  private async fetchAPI(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Weather data
  async getWeather(location: string = "San Francisco"): Promise<WeatherData> {
    try {
      const params = new URLSearchParams({ location, when: "today" });
      return await this.fetchAPI(`/tools/weather?${params}`);
    } catch (error) {
      console.warn("Failed to fetch weather data:", error);
      return this.getMockWeather();
    }
  }

  // Financial data
  async getFinancialData(
    symbols: string[] = ["MSFT", "BTC", "ETH", "NVDA"]
  ): Promise<FinancialData> {
    try {
      return await this.fetchAPI("/tools/financial", {
        method: "POST",
        body: JSON.stringify({
          symbols,
          data_type: "mixed",
        }),
      });
    } catch (error) {
      console.warn("Failed to fetch financial data:", error);
      return this.getMockFinancial();
    }
  }

  // Calendar data
  async getCalendar(date?: string): Promise<CalendarData> {
    try {
      const params = new URLSearchParams();
      if (date) params.append("date", date);
      return await this.fetchAPI(`/tools/calendar?${params}`);
    } catch (error) {
      console.warn("Failed to fetch calendar data:", error);
      return this.getMockCalendar();
    }
  }

  // Todo data
  async getTodos(): Promise<TodoData> {
    try {
      return await this.fetchAPI("/tools/todos");
    } catch (error) {
      console.warn("Failed to fetch todo data:", error);
      return this.getMockTodos();
    }
  }

  // AI Chat with session support
  async sendChatMessage(
    message: string,
    sessionId?: string
  ): Promise<ChatResponse> {
    try {
      const body: { message: string; session_id?: string } = { message };
      if (sessionId) {
        body.session_id = sessionId;
      }

      return await this.fetchAPI("/chat", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.warn("Failed to send chat message:", error);
      throw error;
    }
  }

  // Session management methods
  async createSession(
    metadata?: any
  ): Promise<{ session_id: string; created_at: string }> {
    try {
      return await this.fetchAPI("/sessions", {
        method: "POST",
        body: JSON.stringify({ metadata }),
      });
    } catch (error) {
      console.warn("Failed to create session:", error);
      throw error;
    }
  }

  async getSessionInfo(sessionId: string): Promise<any> {
    try {
      return await this.fetchAPI(`/sessions/${sessionId}`);
    } catch (error) {
      console.warn("Failed to get session info:", error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<{ message: string }> {
    try {
      return await this.fetchAPI(`/sessions/${sessionId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.warn("Failed to delete session:", error);
      throw error;
    }
  }

  async listSessions(): Promise<{
    sessions: string[];
    count: number;
    memory_stats: any;
  }> {
    try {
      return await this.fetchAPI("/sessions");
    } catch (error) {
      console.warn("Failed to list sessions:", error);
      throw error;
    }
  }

  // Get morning briefing
  async getMorningBriefing(): Promise<BriefingData> {
    try {
      return await this.fetchAPI("/briefing?type=smart");
    } catch (error) {
      console.warn("Failed to fetch morning briefing:", error);
      return this.getMockBriefing();
    }
  }

  // Fallback mock data methods
  private getMockWeather(): WeatherData {
    return {
      tool: "weather",
      data: {
        location: "San Francisco",
        current_temp: 72,
        condition: "Partly Cloudy",
        temp_hi: 78,
        temp_lo: 65,
        precip_chance: 10,
        summary: "Partly cloudy with comfortable temperatures",
      },
      timestamp: new Date().toISOString(),
    };
  }

  private getMockFinancial(): FinancialData {
    return {
      tool: "financial",
      data: {
        summary:
          "📊 4 instruments tracked | 📈 3 gaining | 🏆 Best: NVDA (+2.1%)",
        total_items: 4,
        market_status: "mixed",
        data: [
          {
            symbol: "MSFT",
            name: "Microsoft Corporation",
            price: 523.73,
            change: 6.23,
            change_percent: 1.2,
            currency: "USD",
            data_type: "stocks",
          },
          {
            symbol: "BTC",
            name: "Bitcoin",
            price: 96847,
            change: -2284,
            change_percent: -2.3,
            currency: "USD",
            data_type: "crypto",
          },
          {
            symbol: "ETH",
            name: "Ethereum",
            price: 2847,
            change: 42,
            change_percent: 1.5,
            currency: "USD",
            data_type: "crypto",
          },
          {
            symbol: "NVDA",
            name: "NVIDIA Corporation",
            price: 875.12,
            change: 18.2,
            change_percent: 2.1,
            currency: "USD",
            data_type: "stocks",
          },
        ],
      },
      timestamp: new Date().toISOString(),
    };
  }

  private getMockCalendar(): CalendarData {
    return {
      tool: "calendar",
      data: {
        events: [
          { title: "Team Standup", time: "9:00 AM", color: "blue" },
          { title: "Code Review", time: "2:00 PM", color: "green" },
          { title: "Gym Session", time: "6:00 PM", color: "orange" },
        ],
        total_events: 3,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private getMockTodos(): TodoData {
    return {
      tool: "todos",
      data: {
        items: [
          {
            id: "1",
            text: "Review quarterly reports",
            completed: false,
            priority: "high",
          },
          {
            id: "2",
            text: "Update project timeline",
            completed: false,
            priority: "medium",
          },
          {
            id: "3",
            text: "Call insurance company",
            completed: false,
            priority: "low",
          },
          {
            id: "4",
            text: "Book dentist appointment",
            completed: false,
            priority: "low",
          },
        ],
        total_pending: 4,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private getMockBriefing(): BriefingData {
    return {
      briefing:
        "Good morning! Here's your daily overview: Weather is pleasant at 72°F. Markets are mixed with NVDA leading gains. You have 3 meetings today and 4 pending tasks.",
      timestamp: new Date().toISOString(),
    };
  }
}

// Type definitions
export interface WeatherData {
  tool: string;
  data: {
    location: string;
    current_temp: number;
    condition: string;
    temp_hi: number;
    temp_lo: number;
    precip_chance: number;
    summary: string;
  };
  timestamp: string;
}

export interface FinancialData {
  tool: string;
  data: {
    summary: string;
    total_items: number;
    market_status: string;
    data: Array<{
      symbol: string;
      name: string;
      price: number;
      change: number;
      change_percent: number;
      currency: string;
      data_type: string;
    }>;
  };
  timestamp: string;
}

export interface CalendarData {
  tool: string;
  data: {
    events: Array<{
      title: string;
      time: string;
      color: string;
    }>;
    total_events: number;
  };
  timestamp: string;
}

export interface TodoData {
  tool: string;
  data: {
    items: Array<{
      id: string;
      text: string;
      completed: boolean;
      priority: string;
    }>;
    total_pending: number;
  };
  timestamp: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  new_session: boolean;
  timestamp: string;
}

export interface BriefingData {
  briefing: string;
  timestamp: string;
}

// Create a singleton instance
export const apiClient = new AIAgentAPI();

// Server-side API client (uses Node.js environment variables)
export class ServerAIAgentAPI {
  private baseURL: string;

  constructor() {
    // Use Node.js environment variables for server-side
    // Only access process.env on server-side (Node.js environment)
    if (typeof window === "undefined") {
      this.baseURL =
        process.env.VITE_AI_AGENT_API_URL || "http://localhost:8001";

      if (process.env.VITE_DEBUG === "true") {
        console.log(`🔗 Server AI Agent API URL: ${this.baseURL}`);
      }
    } else {
      // Fallback for browser (shouldn't be used)
      this.baseURL = "http://localhost:8001";
    }
  }

  private async fetchAPI(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Weather data
  async getWeather(location: string = "San Francisco"): Promise<WeatherData> {
    try {
      const params = new URLSearchParams({ location, when: "today" });
      return await this.fetchAPI(`/tools/weather?${params}`);
    } catch (error) {
      console.warn("Failed to fetch weather data:", error);
      throw error;
    }
  }

  // Financial data
  async getFinancialData(
    symbols: string[] = ["MSFT", "BTC", "ETH", "NVDA"]
  ): Promise<FinancialData> {
    try {
      return await this.fetchAPI("/tools/financial", {
        method: "POST",
        body: JSON.stringify({
          symbols,
          data_type: "mixed",
        }),
      });
    } catch (error) {
      console.warn("Failed to fetch financial data:", error);
      throw error;
    }
  }

  // Calendar data
  async getCalendar(date?: string): Promise<CalendarData> {
    try {
      const params = new URLSearchParams();
      if (date) params.append("date", date);
      return await this.fetchAPI(`/tools/calendar?${params}`);
    } catch (error) {
      console.warn("Failed to fetch calendar data:", error);
      throw error;
    }
  }

  // Todo data
  async getTodos(): Promise<TodoData> {
    try {
      return await this.fetchAPI("/tools/todos");
    } catch (error) {
      console.warn("Failed to fetch todo data:", error);
      throw error;
    }
  }

  // AI Chat (server-side) with session support
  async sendChatMessage(
    message: string,
    sessionId?: string
  ): Promise<ChatResponse> {
    try {
      const body: { message: string; session_id?: string } = { message };
      if (sessionId) {
        body.session_id = sessionId;
      }

      return await this.fetchAPI("/chat", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.warn("Failed to send chat message:", error);
      throw error;
    }
  }
}

// Server-side instance
export const serverApiClient = new ServerAIAgentAPI();
