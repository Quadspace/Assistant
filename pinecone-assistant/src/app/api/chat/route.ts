import { NextRequest, NextResponse } from 'next/server';
import { Message as PineconeMessage, Pinecone } from '@pinecone-database/pinecone'; // Assuming you might use the Node SDK
import { PineconeStream, StreamingTextResponse } from 'ai'; // Vercel AI SDK

// Helper to get environment variables
const getEnvVar = (name: string, defaultValue?: string): string | undefined => {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    console.warn(`Environment variable ${name} is not set.`);
    // For critical vars like API key, you might throw an error or handle it more strictly
  }
  return value || defaultValue;
};

// This is a placeholder. In a real app, you might initialize Pinecone client once.
// However, for serverless functions, re-initializing per request or using a cached client is common.
// For direct API calls, you don't need the Pinecone SDK client here, just for type safety or if you switch to SDK calls.

export async function POST(request: NextRequest) {
  const apiKey = getEnvVar('PINECONE_API_KEY');
  const pineconeEnvironment = getEnvVar('PINECONE_ENVIRONMENT'); // Often needed for SDK

  if (!apiKey) {
    return NextResponse.json({ status: "error", message: "PINECONE_API_KEY is not set." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { 
      assistant_name, 
      messages 
    } = body;

    if (!assistant_name) {
      return NextResponse.json({ status: "error", message: "'assistant_name' is required." }, { status: 400 });
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ status: "error", message: "'messages' array is required and cannot be empty." }, { status: 400 });
    }

    // Ensure messages have the correct structure (e.g., { role: 'user', content: 'Hello' })
    // Add any validation for message structure here if necessary.

    const chatPayload = {
      messages: messages, // Assuming messages are already in the format Pinecone expects
      // stream: true, // Enable streaming if you want to use it
      // other parameters like model, temperature can be added if supported by the chat endpoint
    };

    // Direct API call to Pinecone Assistant Chat
    // The endpoint structure needs to be verified from Pinecone documentation.
    // Common patterns: 
    // - https://api.pinecone.io/assistant/assistants/{assistant_name}/chat
    // - Or a data-plane URL like https://{assistant_name}-{project_id}.svc.{environment}.pinecone.io/chat/completions (OpenAI compatible)
    // The Pinecone Assistant docs state: "Chat with your assistant and receive responses as a JSON object or as a text stream."
    // And for OpenAI-compatible interface: "Use the /v1/chat/completions endpoint."
    // Let's assume an OpenAI-compatible endpoint for now as it's common for streaming with Vercel AI SDK.
    // This would typically be on a data plane URL.
    // **IMPORTANT**: This URL is a placeholder and needs to be the correct one for your assistant.
    // The Pinecone documentation for "OpenAI-compatible interface" should provide the exact URL structure.
    // It might look something like: `https://<YOUR_ASSISTANT_ENDPOINT>/v1/chat/completions`
    // For the direct assistant chat (non-OpenAI compatible), it might be simpler but potentially not streamable with PineconeStream directly.

    const pineconeChatUrl = getEnvVar('PINECONE_ASSISTANT_CHAT_ENDPOINT') || `https://api.pinecone.io/assistant/assistants/${assistant_name}/chat`;
    // If using a specific OpenAI-compatible endpoint from Pinecone, set PINECONE_ASSISTANT_CHAT_ENDPOINT to that.

    const response = await fetch(pineconeChatUrl, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Pinecone chat API error! status: ${response.status}, body: ${errorBody}`);
      return NextResponse.json({
        status: "error",
        message: `Error from Pinecone chat API: ${response.statusText}`,
        details: errorBody
      }, { status: response.status });
    }

    // If Pinecone returns a stream directly compatible with Vercel AI SDK's PineconeStream:
    // const stream = PineconeStream(response, { 
    //   // Callbacks for stream events if needed
    //   onStart: async () => console.log("Stream started"),
    //   onToken: async (token) => console.log("Token: ", token),
    //   onCompletion: async (completion) => console.log("Completion: ", completion),
    //   onFinal: async (completion) => console.log("Final completion: ", completion)
    // });
    // return new StreamingTextResponse(stream);

    // For now, returning the JSON response directly. Streaming can be added if the endpoint supports it.
    const responseData = await response.json();
    return NextResponse.json(responseData, { status: response.status });

  } catch (error) {
    console.error(`Error in chat handler: ${error instanceof Error ? error.message : String(error)}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Unexpected token') || errorMessage.includes('JSON at position')) {
        return NextResponse.json({
            status: "error",
            message: "Invalid JSON in request body.",
        }, { status: 400 });
    }
    return NextResponse.json({
      status: "error",
      message: `Failed to process chat request: ${errorMessage}`
    }, { status: 500 });
  }
} 