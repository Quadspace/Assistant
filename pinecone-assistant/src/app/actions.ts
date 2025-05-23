'use server'
import { createStreamableValue } from 'ai/rsc'
import { EventSource } from 'extended-eventsource';

type Message = {
  role: string;
  content: string;
}

export async function chat(messages: Message[]) {
  // Create an initial stream, which we'll populate with events from the Pinecone Assistants API
  const stream = createStreamableValue()
  
  // Construct the full URL to the Pinecone Assistant API
  // The URL format should match what's expected by Pinecone
  const assistantName = process.env.PINECONE_ASSISTANT_NAME
  const url = `https://api.pinecone.io/assistant/assistants/${assistantName}/chat`
  
  const eventSource = new EventSource(url, {
    method: 'POST',
    body: JSON.stringify({
      stream: true,
      messages,
    } ),
    headers: process.env.PINECONE_API_KEY ? {
      'Api-Key': process.env.PINECONE_API_KEY,
    } : undefined,
    disableRetry: true,
  });
  
  // When we receive a new message from the Pinecone Assistant API, we update the stream
  // Unless the Assistant is done, in which case we close the stream
  eventSource.onmessage = (event: MessageEvent) => {
    const message = JSON.parse(event.data)
    if (message?.choices[0]?.finish_reason) {
      eventSource.close();
      stream.done();
    } else {
      stream.update(event.data)
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('EventSource error:', error);
    eventSource.close();
  };
  
  return { object: stream.value }
}
