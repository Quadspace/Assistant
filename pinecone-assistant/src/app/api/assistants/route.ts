import { NextResponse } from 'next/server';

// Helper to get environment variables or use defaults
const getEnvVar = (name: string, defaultValue?: string): string | undefined => {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value || defaultValue;
};

export async function GET() {
  const apiKey = getEnvVar('PINECONE_API_KEY');
  const assistantName = getEnvVar('PINECONE_ASSISTANT_NAME'); // This is used to check if a *specific* assistant exists
  
  if (!apiKey || !assistantName) {
    return NextResponse.json({
      status: "error",
      message: "PINECONE_API_KEY and PINECONE_ASSISTANT_NAME environment variables are required for this GET request.",
      exists: false
    }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.pinecone.io/assistant/assistants', {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const assistantsPayload = await response.json();
    // Ensure assistantsPayload has the expected structure
    if (!assistantsPayload || !Array.isArray(assistantsPayload.assistants)) {
        console.error("Unexpected response structure from Pinecone API:", assistantsPayload);
        throw new Error("Unexpected response structure from Pinecone API. Expected an object with an 'assistants' array.");
    }
    const assistantExists = assistantsPayload.assistants.some((assistant: any) => assistant.name === assistantName);

    return NextResponse.json({
      status: "success",
      message: `Assistant '${assistantName}' check completed.`,
      exists: assistantExists,
      assistant_name: assistantName // Keep this to confirm which assistant name was checked
    }, { status: 200 });

  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({
      status: "error",
      message: `Failed to check assistant: ${error instanceof Error ? error.message : String(error)}`,
      exists: false
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const apiKey = getEnvVar('PINECONE_API_KEY');
  if (!apiKey) {
    return NextResponse.json({
      status: "error",
      message: "PINECONE_API_KEY environment variable is not set.",
    }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { 
      assistant_name, 
      instructions, 
      model = 'gpt-4o', // Default model, can be overridden
      region = 'us-east-1' // Default region, can be overridden
    } = body;

    if (!assistant_name) {
      return NextResponse.json({
        status: "error",
        message: "Required field 'assistant_name' is missing in the request body.",
      }, { status: 400 });
    }

    const createPayload = {
      name: assistant_name,
      instructions: instructions || "You are a helpful assistant.", // Default instructions
      model: {
        name: model,
      },
      region: region,
      // Add other fields like metadata, tools if needed based on Pinecone API
    };

    const response = await fetch('https://api.pinecone.io/assistant/assistants', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}, body: ${JSON.stringify(responseData)}`);
      return NextResponse.json({
        status: "error",
        message: `Failed to create assistant: ${responseData.message || response.statusText}`,
        details: responseData.details || responseData
      }, { status: response.status });
    }
    
    // The Pinecone API might return a 201 Created with the assistant details
    // or a 200 OK if it's an upsert-like operation or synchronous creation.
    // Adjust status code in response if needed based on actual Pinecone behavior.
    return NextResponse.json({
      status: "success",
      message: `Assistant '${assistant_name}' created successfully.`,
      assistant: responseData, 
    }, { status: response.status }); // Use the status from Pinecone's response

  } catch (error) {
    console.error(`Error creating assistant: ${error instanceof Error ? error.message : String(error)}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Check for specific JSON parsing errors
    if (errorMessage.includes('Unexpected token') || errorMessage.includes('JSON at position')) {
        return NextResponse.json({
            status: "error",
            message: "Invalid JSON in request body.",
        }, { status: 400 });
    }
    return NextResponse.json({
      status: "error",
      message: `Failed to create assistant: ${errorMessage}`
    }, { status: 500 });
  }
}