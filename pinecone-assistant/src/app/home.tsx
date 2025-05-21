'use client'
import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { Message, File, Reference } from './types';
import AssistantFiles from './components/AssistantFiles';
import { chat } from './actions';
import { readStreamableValue } from 'ai/rsc';

interface HomeProps {
  initialShowAssistantFiles: boolean;
  showCitations: boolean;
}

export default function Home({ initialShowAssistantFiles, showCitations }: HomeProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistantExists, setAssistantExists] = useState<boolean | null>(null);
  const [assistantName, setAssistantName] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [referencedFiles, setReferencedFiles] = useState<Reference[]>([]);
  const [showAssistantFiles, setShowAssistantFiles] = useState(initialShowAssistantFiles);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the assistant exists
    const checkAssistant = async () => {
      try {
        const response = await fetch('/api/assistants');
        const data = await response.json();
        if (data.status === 'success') {
          setAssistantExists(data.exists);
          setAssistantName(data.assistant_name);
          if (data.exists) {
            fetchFiles();
          }
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError('Failed to check assistant status. Please try again later.');
        console.error('Error checking assistant:', err);
      }
    };
    checkAssistant();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      if (data.status === 'success') {
        setFiles(data.files);
      } else {
        console.error('Error fetching files:', data.message);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  const handleChat = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: uuidv4(),
      content: input,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setError(null);
    const newReferences: Reference[] = [];

    try {
      const assistantMessage: Message = {
        id: uuidv4(),
        content: '',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Get the response from the chat function
      const response = await chat(messages.concat(userMessage).map(m => ({ role: m.role, content: m.content })));
      
      // Use readStreamableValue to process the stream
      if (response && response.object) {
        try {
          // Process the stream using the async iterator pattern
          for await (const chunk of readStreamableValue(response.object)) {
            try {
              if (chunk) {
                const data = JSON.parse(chunk);
                if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                  // Update the assistant message with the new content
                  setMessages((prev) => {
                    const updatedMessages = [...prev];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage.role === 'assistant') {
                      lastMessage.content += data.choices[0].delta.content;
                    }
                    return updatedMessages;
                  });
                }
                
                // Check for references in the response
                if (data.references) {
                  const refs = data.references.map((ref: any) => ({
                    file_id: ref.file_id,
                    quote: ref.quote || '',
                  }));
                  setReferencedFiles((prev) => [...prev, ...refs]);
                }
              }
            } catch (e) {
              console.error('Error processing stream chunk:', e);
            }
          }
        } catch (err) {
          console.error('Error reading stream:', err);
          setError('An error occurred while streaming the response.');
        } finally {
          setIsStreaming(false);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setIsStreaming(false);
      setError('Failed to get a response. Please try again.');
      
      // Remove the empty assistant message if there was an error
      setMessages((prev) => prev.filter(m => m.content !== ''));
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          {assistantName ? `Connected to Pinecone Assistant: ${assistantName}` : 'Connecting to Pinecone Assistant...'}
        </p>
      </div>

      {assistantExists ? (
        <div className="w-full max-w-5xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4 min-h-[400px] max-h-[600px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
                    <p className="text-xl mb-2">👋 Welcome to Pinecone Assistant</p>
                    <p>Start a conversation by typing a message below.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`flex flex-col w-full ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <span className={`text-xs text-gray-500 dark:text-gray-400 mb-1`}>
                            {message.role === 'user' ? 'You' : 'Assistant'}
                          </span>
                          <span className={`px-4 py-2 rounded-lg inline-block ${
                            message.role === 'user' 
                              ? 'bg-indigo-500 text-white' 
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300'
                          } max-w-[80%] break-words`}>
                            <ReactMarkdown
                              components={{
                                a: ({ node, ...props }) => (
                                  <a {...props} className="text-blue-600 dark:text-blue-400 hover:underline">
                                    🔗 {props.children}
                                  </a>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                            {message.references && showCitations && (
                              <div className="mt-2">
                                <ul>
                                  {message.references.map((ref, i) => (
                                    <li key={i}>
                                      <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                        {ref.name}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleChat(); }} className="flex mb-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Type your message..."
                  disabled={isStreaming}
                />
                <button
                  type="submit"
                  className="bg-indigo-500 text-white p-2 rounded-r-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isStreaming}
                >
                  {isStreaming ? 'Streaming...' : 'Send'}
                </button>
              </form>
              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md shadow-md">
                  <div className="flex items-center">
                    <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="font-semibold">Error</p>
                  </div>
                  <p className="mt-2">{error}</p>
                </div>
              )}
            </div>
            {showAssistantFiles && (
              <div className="w-full">
                <AssistantFiles files={files} referencedFiles={referencedFiles} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md max-w-2xl">
          <div className="flex items-center">
            <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="font-semibold">Error</p>
          </div>
          <p className="mt-2">{error}</p>
          <div className="mt-4 text-sm">
            <p className="font-semibold">To resolve this issue:</p>
            <ol className="list-decimal list-inside mt-2 space-y-2">
              <li>Create a Pinecone Assistant at <a href="https://app.pinecone.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://app.pinecone.io</a></li>
              <li>Export the environment variable <code className="bg-red-200 px-1 rounded">PINECONE_ASSISTANT_NAME</code> with the value of your assistant&apos;s name</li>
              <li>Restart your application</li>
            </ol>
          </div>
        </div>
       )}
      <div className="mt-8 text-sm text-gray-500 flex space-x-4">
        <a href="https://www.pinecone.io/blog/pinecone-assistant/" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">
          ℹ️ What are Pinecone Assistants?
        </a>
        <a href="https://app.pinecone.io" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">
          🤖 Create your own Pinecone Assistant today
        </a>
      </div>
    </main>
   );
}
