'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InputGroup, InputGroupInput, InputGroupButton } from '@/components/ui/input-group';
import { ArrowUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy } from 'lucide-react';
import { Shimmer } from "@/components/ai-elements/shimmer";

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();

  const isAILoading = status === 'submitted' || status === 'streaming';

  return (
    <main className="flex flex-col items-center justify-between min-h-screen px-4 py-6 sm:p-24">
      <ScrollArea className="h-full w-full lg:max-w-4xl sm:max-w-full p-4">
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
                          className={`py-2 px-3 rounded-4xl ${message.role === 'user' ? 'bg-zinc-300 text-black' : ''}`}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {part.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                      {message.role === 'assistant' && !isAILoading && ( // Only show copy button for AI messages when not loading
                        <button
                          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mt-1 ml-2 cursor-pointer"
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
                Thinking...
              </Shimmer>
            </div>
          </div>
        )}
      </ScrollArea>

      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
        className="fixed bottom-0 flex w-full lg:max-w-4xl md:max-w-3xl sm:max-w-full p-6 bg-white dark:bg-black"
      >
        <InputGroup className="flex-grow mr-2 pr-2 pl-2 h-14 rounded-4xl">
          <InputGroupInput
            value={input}
            placeholder="Ask anything"
            onChange={e => setInput(e.currentTarget.value)}
          />
          <InputGroupButton type="submit" className="bg-black text-white font-bold rounded-full h-10 w-10 cursor-pointer">
            <ArrowUp className="size-6" />
          </InputGroupButton>
        </InputGroup>
      </form>
    </main>
  );
}