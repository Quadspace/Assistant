'use client'
import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { Message, File, Reference } from './types';
import AssistantFiles from './components/AssistantFiles';
import { chat } from './actions';
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
      const response = await chat(messages.concat(userMessage).map(m => ({ role: m.role, content: m.content })));
      const reader = response.object.getReader();
      let done = false;
      let content = '';
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          try {
            const data = JSON.parse(value);
            if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
              content += data.choices[0].delta.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content,
                };
                return updated;
              });
            }
            // Check for references/citations in the response
            if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.references) {
              const refs = data.choices[0].delta.references;
              refs.forEach((ref: Reference) => {
                if (!newReferences.some(r => r.name === ref.name)) {
                  newReferences.push(ref);
                }
              });
            }
          } catch (e) {
            console.error('Error parsing stream data:', e);
          }
        }
      }
      if (newReferences.length > 0) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            references: newReferences,
          };
          return updated;
        });
        setReferencedFiles((prev) => {
          const combined = [...prev];
          newReferences.forEach(ref => {
            if (!combined.some(r => r.name === ref.name)) {
              combined.push(ref);
            }
          });
          return combined;
        });
      }
    } catch (err) {
      console.error('Error in chat:', err);
      setError('Failed to get a response. Please try again later.');
    } finally {
      setIsStreaming(false);
    }
  };
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Pinecone Assistant</h1>
        {assistantExists !== null && (
          <div className="text-sm mb-4 text-gray-600 dark:text-gray-400">
            {assistantExists ? (
              <span>Connected to assistant: <span className="font-semibold">{assistantName}</span></span>
            ) : (
              <span className="text-red-500">No assistant found with name: <span className="font-semibold">{assistantName}</span></span>
            )}
          </div>
        )}
      </div>
      {assistantExists ? (
        <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="flex flex-col md:flex-row h-[calc(100vh-200px)]">
            <div className="flex-grow flex flex-col p-4 overflow-hidden">
              <div className="flex-grow overflow-y-auto mb-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                    <p>Start a conversation with your Pinecone Assistant.</p>
                    <p className="text-sm mt-2">Your assistant has access to files you've uploaded to it.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start max-w-[80%]`}>
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          message.role === 'user' ? 'bg-indigo-100 text-indigo-500' : 'bg-gray-100 text-gray-500'
                        } mr-2 ml-2`}>
                          {message.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <span className={`px-4 py-2 rounded-lg ${
                          message.role === 'user' ? 
                          'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
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
