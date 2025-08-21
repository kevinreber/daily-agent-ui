export async function action({ request }: { request: Request }) {
  console.log("🤖 API v1 Chat: Processing request...");

  try {
    const body = await request.json();
    const { message, session_id } = body;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "API-Version": "v1",
        },
      });
    }

    console.log(
      `💬 v1 API: Proxying message: ${message} (session: ${session_id || "new"})`
    );

    // Get AI Agent API URL from environment
    const aiAgentUrl =
      process.env.VITE_AI_AGENT_API_URL || "http://localhost:8001";

    // Prepare request body with optional session ID
    const requestBody: { message: string; session_id?: string } = {
      message: message.trim(),
    };

    if (session_id) {
      requestBody.session_id = session_id;
    }

    // Proxy request to AI Agent API (server-to-server, no CORS!)
    const response = await fetch(`${aiAgentUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(
        `AI Agent API error: ${response.status} ${response.statusText}`
      );
    }

    const aiResponse = await response.json();

    console.log("✅ API v1 Chat: Response received");

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse.response,
        session_id: aiResponse.session_id,
        new_session: aiResponse.new_session,
        timestamp: aiResponse.timestamp,
        version: "v1",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "API-Version": "v1",
        },
      }
    );
  } catch (error) {
    console.error("❌ API v1 Chat error:", error);

    return new Response(
      JSON.stringify({
        error:
          "Sorry, I'm having trouble connecting to the AI service right now. Please try again later.",
        timestamp: new Date().toISOString(),
        version: "v1",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "API-Version": "v1",
        },
      }
    );
  }
}
