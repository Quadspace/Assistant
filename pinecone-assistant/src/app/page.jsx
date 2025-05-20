'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [references, setReferences] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [pineconeAssistantFiles, setPineconeAssistantFiles] = useState([]);

  // Fetch files from Pinecone Assistant
  const fetchPineconeAssistantFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      if (data.status === 'success') {
        setPineconeAssistantFiles(data.files);
        console.log('Files from Pinecone Assistant:', data.files); // Log fetched files
      } else {
        console.error('Error fetching files from Pinecone Assistant:', data.message);
      }
    } catch (error) {
      console.error('Error fetching files from Pinecone Assistant:', error);
    }
  };

  useEffect(() => {
    fetchPineconeAssistantFiles(); // Fetch files on component mount
  }, []);

  // Handle message submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Add user message
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Simulate AI response with references
    setTimeout(() => {
      const aiMessage = { 
        role: 'assistant', 
        content: 'This is a sample response from the Pinecone Assistant. In a real implementation, this would be streaming from the API with actual content based on your query.',
        references: [
          { id: 'ref1', title: 'Sample Document 1', excerpt: 'This is a sample reference excerpt...' },
          { id: 'ref2', title: 'Sample Document 2', excerpt: 'Another sample reference showing how citations work...' }
        ]
      };
      setMessages(prev => [...prev, aiMessage]);
      setReferences(aiMessage.references);
      setIsLoading(false);
    }, 1500);
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles(prev => [...prev, ...files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploaded'
    }))]);
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploaded'
    }))]);
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-neutral-200 flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex items-center space-x-3">
          <div className="w-8 h-8 relative">
            <Image
              priority
              src="GreenBlack.png"
              width={100}
              alt="Logo"
              fill
              className="object-contain"
            />
          </div>
          <div className="font-medium text-lg">Pinecone Assistant</div>
        </div>
        
        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-xs uppercase text-neutral-500 font-medium mb-2 px-2">Recent Conversations</div>
          <button className="w-full text-left p-2 rounded-lg hover:bg-neutral-100 text-sm text-neutral-700 transition-colors">
            Document Analysis - May 20
          </button>
          <button className="w-full text-left p-2 rounded-lg bg-neutral-100 text-sm text-brand-green font-medium transition-colors">
            Current Chat
          </button>
        </div>
        
        {/* User Profile */}
        <div className="p-4 border-t border-neutral-200 flex items-center">
          <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-700 font-medium">
            U
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium">User Name</div>
            <button className="text-xs text-neutral-500 hover:text-brand-green transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 p-4 flex items-center justify-between">
          <h1 className="text-xl font-medium">Chat Assistant</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowReferences(!showReferences)}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${showReferences ? 'bg-brand-green text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
            >
              {showReferences ? 'Hide References' : 'Show References'}
            </button>
            <button className="text-sm px-3 py-1.5 rounded-md bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors">
              New Chat
            </button>
          </div>
        </header>
        
        {/* Chat Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 relative mb-4">
                  <Image
                    priority
                    src="GreenBlack.png"
                    width={100}
                    alt="Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <h2 className="text-2xl font-medium text-neutral-800 mb-2">Welcome to Pinecone Assistant</h2>
                <p className="text-neutral-600 max-w-md mb-8">
                  Ask questions about your documents or upload new files to get started.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                  <div className="card hover-lift cursor-pointer">
                    <h3 className="font-medium mb-2">Ask a question</h3>
                    <p className="text-sm text-neutral-600">
                      "Summarize the key points from the latest quarterly report"
                    </p>
                  </div>
                  <div className="card hover-lift cursor-pointer">
                    <h3 className="font-medium mb-2">Upload documents</h3>
                    <p className="text-sm text-neutral-600">
                      Add PDF, Word, or text files to enhance your assistant's knowledge
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-3xl rounded-xl p-4 ${
                      message.role === 'user' 
                        ? 'bg-brand-green text-white' 
                        : 'bg-white border border-neutral-200 shadow-subtle'
                    }`}
                  >
                    <div className="prose">
                      {message.content}
                    </div>
                    
                    {message.references && message.references.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-neutral-200 text-sm">
                        <div className="font-medium text-neutral-700 mb-1">References:</div>
                        <div className="space-y-1">
                          {message.references.map((ref, i) => (
                            <div key={i} className="text-neutral-600 hover:text-brand-green cursor-pointer">
                              {ref.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-3xl rounded-xl p-4 bg-white border border-neutral-200 shadow-subtle">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-neutral-300 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-neutral-300 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-neutral-300 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* References Panel */}
          {showReferences && (
            <div className="w-80 border-l border-neutral-200 bg-white overflow-y-auto p-4">
              <div className="font-medium mb-4">References</div>
              
              {references.length > 0 ? (
                <div className="space-y-4">
                  {references.map((ref, index) => (
                    <div key={index} className="p-3 bg-neutral-50 rounded-lg">
                      <div className="font-medium text-sm mb-1">{ref.title}</div>
                      <div className="text-xs text-neutral-600">{ref.excerpt}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-neutral-500">
                  No references available for this conversation.
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* File Upload Area */}
        <div 
          className={`px-6 py-3 border-t border-neutral-200 ${isDragging ? 'bg-brand-green bg-opacity-10' : 'bg-white'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center bg-neutral-100 rounded-full px-3 py-1 text-xs">
                  <span className="truncate max-w-xs">{file.name}</span>
                  <button 
                    className="ml-2 text-neutral-500 hover:text-neutral-700"
                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <label className="cursor-pointer text-neutral-500 hover:text-brand-green transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <input 
                type="file" 
                multiple 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </label>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 input border-0 focus:ring-0 focus:border-0 shadow-none"
              disabled={isLoading}
            />
            
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()} 
              className={`p-2 rounded-full ${
                isLoading || !input.trim() 
                  ? 'text-neutral-400 cursor-not-allowed' 
                  : 'text-brand-green hover:bg-neutral-100'
              } transition-colors`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
          
          {isDragging && (
            <div className="absolute inset-0 bg-brand-green bg-opacity-5 border-2 border-dashed border-brand-green rounded-lg flex items-center justify-center">
              <div className="text-brand-green font-medium">Drop files to upload</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
