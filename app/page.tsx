'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InputGroup, InputGroupInput, InputGroupButton } from '@/components/ui/input-group';
import { ArrowUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy } from 'lucide-react';
import { Plus } from 'lucide-react';
import { Shimmer } from "@/components/ai-elements/shimmer";

export default function Chat() {
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { messages, sendMessage, status, error } = useChat({
    onToolCall: async ({ toolCall }) => {
      if (toolCall.toolName === 'google_search') {
        setIsSearching(true);
      }
    },
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAILoading = status === 'submitted' || status === 'streaming';
  useEffect(() => {
    if (!isAILoading) {
      setIsSearching(false);
    }
  }, [isAILoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <main className="flex flex-col h-[calc(100vh-3rem) max-w-4xl w-full mx-auto dark:bg-zinc-900 p-4">
      {error && (
        <div className="text-red-500 mb-4">{error.message}</div>
      )}
      <ScrollArea className="flex-1 w-full pb-14">
        {messages.map(message => (
          <div key={message.id} className="mb-8 whitespace-pre-wrap">
            {message.role === 'user' ? '' : ''}
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return (
                    <div key={`${message.id}-${i}`} className="flex flex-col">
                      <div
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`p-4 ${message.role === 'user' ? 'py-2 px-5 rounded-4xl bg-zinc-300 text-black dark:bg-zinc-800 dark:text-white' : ''}`}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {part.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                      {message.role === 'assistant' && !isAILoading && (
                        <button
                          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mt-1 ml-4 cursor-pointer"
                          onClick={() => navigator.clipboard.writeText(part.text)}
                        >
                          <Copy className="size-4" />
                        </button>
                      )}
                    </div>
                  );
              }
            })}
          </div>
        ))}
        {isAILoading && (
          <div className="flex justify-start mb-8 whitespace-pre-wrap">
            <div className="py-2 px-3 rounded-4xl">
              <Shimmer as="p" duration={2} spread={5}>
                {isSearching ? 'Searching the web...' : 'Thinking...'}
              </Shimmer>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {selectedFile && (
        <div className="flex items-center space-x-2 p-2 mb-4 rounded-lg">
          <div className="relative w-16 h-16 rounded-4xl overflow-hidden flex items-center justify-center bg-zinc-200 dark:bg-zinc-700">
            {selectedFile.type.startsWith('image/') ? (
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Selected file preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">{selectedFile.type.split('/')[1] || 'File'}</span>
            )}
            <button
              onClick={() => setSelectedFile(null)}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-3xl p-1 text-xs leading-none"
            >
              x
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={async e => {
          e.preventDefault();
          if (input.trim() === '' && !selectedFile) return;

          const parts: ({ type: 'text'; text: string } | { type: 'file'; mediaType: string; data: string; url: string })[] = [];

          if (input.trim() !== '') {
            parts.push({ type: 'text', text: input });
          }

          if (selectedFile) {
            const base64Content = await fileToBase64(selectedFile);
            parts.push({
              type: 'file',
              mediaType: selectedFile.type,
              data: base64Content,
              url: '', // Dummy URL to satisfy FileUIPart requirement
            });
          }

          sendMessage({ parts });
          setInput('');
          setSelectedFile(null);
        }}
        className="fixed bottom-0 flex w-full lg:max-w-4xl  sm:max-w-full pb-6 bg-white dark:bg-zinc-900"
      >
        <InputGroup className="flex-grow mr-4 ml-4 justify-center pr-2 pl-2 sm:mr-2 sm:ml-2 h-14 rounded-4xl dark:bg-zinc-800">
          <label htmlFor="file-input" className="flex items-center justify-center h-10 w-10 cursor-pointer text-gray-500 hover:text-gray-700">
            <Plus className="size-5" />
          </label>
          <input
            id="file-input"
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <InputGroupInput
            value={input}
            placeholder="Ask anything"
            onChange={e => setInput(e.currentTarget.value)}
          />
          <InputGroupButton type="submit" className="bg-black dark:bg-white text-white dark:text-black font-bold rounded-full h-10 w-10 cursor-pointer">
            <ArrowUp className="size-6"/>
          </InputGroupButton>
        </InputGroup>
      </form>
    </main>
  );
}