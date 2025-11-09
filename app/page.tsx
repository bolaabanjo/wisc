'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();

  return (
    <main className="flex flex-col items-center justify-between min-h-screen p-24">
      <ScrollArea className="h-[400px] w-full max-w-md rounded-md border p-4">
        {messages.map(message => (
          <div key={message.id} className="mb-4 whitespace-pre-wrap">
            {message.role === 'user' ? '' : 'Israel: '}
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return (
                    <div
                      key={`${message.id}-${i}`}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`p-2 rounded-lg ${message.role === 'user' ? 'bg-zinc-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                      >
                        {part.text}
                      </div>
                    </div>
                  );
              }
            })}
          </div>
        ))}
      </ScrollArea>

      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
        className="fixed bottom-0 flex w-full max-w-md p-4 bg-white dark:bg-black"
      >
        <Input
          className="flex-grow mr-2"
          value={input}
          placeholder="Say something..."
          onChange={e => setInput(e.currentTarget.value)}
        />
        <Button type="submit">Send</Button>
      </form>
    </main>
  );
}