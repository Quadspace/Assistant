import { NextRequest, NextResponse } from 'next/server';
import { checkAssistantPrerequisites } from '../../utils/assistantUtils';

// Helper to get environment variables or use defaults
const getEnvVar = (name: string, defaultValue?: string): string | undefined => {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value || defaultValue;
};

export async function GET(request: NextRequest) {
  const apiKey = getEnvVar('PINECONE_API_KEY');
  // Assistant name could be a query parameter for GETting files of a specific assistant
  const searchParams = request.nextUrl.searchParams;
  const assistantName = searchParams.get('assistant_name') || getEnvVar('PINECONE_ASSISTANT_NAME');
  
  if (!apiKey) {
    return NextResponse.json({
      status: "error",
      message: "PINECONE_API_KEY environment variable is required.",
      files: []
    }, { status: 400 });
  }

  if (!assistantName) {
    return NextResponse.json({
      status: "error",
      message: "Assistant name is required. Provide it as 'assistant_name' query parameter or set PINECONE_ASSISTANT_NAME env var.",
      files: []
    }, { status: 400 });
  }

  try {
    // The endpoint for listing files might be different from the one I saw earlier.
    // Based on Pinecone docs, it's often /assistant/assistants/{assistant_name}/files or similar.
    // Let's assume a structure like: `https://api.pinecone.io/assistant/assistants/${assistantName}/files`
    // The previous URL was `https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}`
    // Using the one from Pinecone Assistant Docs for consistency if possible.
    // Let's try with a more standard looking one first, if it fails, we can adjust.
    // For listing files directly associated with an assistant using the management API:
    const listFilesUrl = `https://api.pinecone.io/assistant/assistants/${assistantName}/files`;


    const response = await fetch(listFilesUrl, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`HTTP error listing files! status: ${response.status}, body: ${errorBody}`);
      throw new Error(`HTTP error! status: ${response.status}. ${errorBody}`);
    }

    const data = await response.json();
    
    // Adjusting to typical API response which might be an object with a 'files' array or just an array
    const filesArray = Array.isArray(data) ? data : (data.files && Array.isArray(data.files) ? data.files : []);

    if (!Array.isArray(filesArray)) {
         console.error('Unexpected response format when listing files:', data);
         throw new Error('Unexpected response format: files is not an array or not in expected structure');
    }

    const fileData = filesArray.map((file: any) => ({
      id: file.id,
      name: file.name,
      size_bytes: file.size_bytes, // Standardizing to size_bytes if API uses that
      created_at: file.created_at, // Standardizing
      status: file.status,
      // metadata: file.metadata // Metadata might not be in the list view, depends on API
    }));

    return NextResponse.json({
      status: "success",
      message: `Files for assistant '${assistantName}' retrieved successfully.`,
      files: fileData
    }, { status: 200 });

  } catch (error) {
    console.error(`Error listing assistant files: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({
      status: "error",
      message: `Failed to list assistant files: ${error instanceof Error ? error.message : String(error)}`,
      files: []
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const apiKey = getEnvVar('PINECONE_API_KEY');
   if (!apiKey) {
    return NextResponse.json({ status: "error", message: "PINECONE_API_KEY environment variable is not set." }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const assistantName = searchParams.get('assistant_name') || getEnvVar('PINECONE_ASSISTANT_NAME');

  if (!assistantName) {
    return NextResponse.json({
      status: "error",
      message: "Assistant name is required to upload file. Provide 'assistant_name' as a query parameter or set PINECONE_ASSISTANT_NAME.",
    }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const metadataString = formData.get('metadata') as string | null; // Expect metadata as a JSON string

    if (!file) {
      return NextResponse.json({ status: "error", message: "No file provided in the request." }, { status: 400 });
    }

    let metadata;
    if (metadataString) {
      try {
        metadata = JSON.parse(metadataString);
      } catch (e) {
        return NextResponse.json({ status: "error", message: "Invalid JSON format for metadata." }, { status: 400 });
      }
    }
    
    // Pinecone's direct file upload to an assistant usually involves a specific endpoint.
    // Example: `https://api.pinecone.io/assistant/assistants/{assistant_name}/files`
    // The SDK handles multipart creation. For direct API, we construct FormData.
    // Note: The Pinecone API documentation should be the definitive source for the exact endpoint and payload.
    // This is a common pattern.

    const uploadUrl = `https://api.pinecone.io/assistant/assistants/${assistantName}/files`;
    
    const uploadFormData = new FormData();
    uploadFormData.append('file', file, file.name);
    if (metadata) {
      // How metadata is sent can vary. Sometimes it's part of the file object attributes,
      // sometimes a separate JSON part. The Pinecone Python SDK uses a `metadata` field in `upload_file`.
      // For direct API, it might be part of the file description or a separate field.
      // Let's assume it's a JSON string field if not directly part of the file object for multipart.
      // The Pinecone API might expect a specific structure for the metadata part.
      // This part is speculative without direct Pinecone REST API docs for this specific call.
      // Typically, the file content goes as one part, and metadata might go as another.
      // Or, metadata is included in a JSON object describing the file, then the file itself.
      // The Pinecone SDK likely abstracts this.
      // For now, we will assume the API can take metadata alongside the file.
      // The Python SDK call is `assistant.upload_file(file_path="...", metadata={...})`
      // This suggests metadata is linked to the file upload operation.
      // A common way for raw HTTP is to send metadata as another form field.
       uploadFormData.append('metadata', JSON.stringify(metadata)); // Sending as a JSON string part
    }


    // The actual fetch for file upload to Pinecone might differ slightly.
    // They might have a specific content-type or structure.
    // Using a general approach for FormData upload.
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        // 'Content-Type': 'multipart/form-data' is usually set automatically by fetch with FormData
        // but some APIs are picky.
      },
      body: uploadFormData,
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`HTTP error uploading file! status: ${response.status}, body: ${JSON.stringify(responseData)}`);
      return NextResponse.json({
        status: "error",
        message: `Failed to upload file: ${responseData.message || response.statusText}`,
        details: responseData.details || responseData
      }, { status: response.status });
    }

    return NextResponse.json({
      status: "success",
      message: `File '${file.name}' uploaded successfully to assistant '${assistantName}'.`,
      file_info: responseData, // This will contain the ID and other details of the uploaded file from Pinecone
    }, { status: response.status }); // Typically 201 Created or 200 OK

  } catch (error) {
    console.error(`Error uploading file: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({
      status: "error",
      message: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}