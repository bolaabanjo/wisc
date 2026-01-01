import { UIMessage, convertToModelMessages } from 'ai';
import { SafetyError, RateLimitError, AuthenticationError } from 'cencori';
import { cencori } from '@/lib/cencori';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    try {
        // Convert messages to Cencori format
        const cencoriMessages = messages.map((m) => {
            const converted = convertToModelMessages([m])[0];
            let content = '';
            
            if (typeof converted.content === 'string') {
                content = converted.content;
            } else if (Array.isArray(converted.content)) {
                content = converted.content
                    .filter((part) => part.type === 'text')
                    .map((part) => part.text)
                    .join(' ');
            }
            
            return { role: m.role as 'user' | 'assistant' | 'system', content };
        });

        const systemPrompt = `You are Wisc, an AI assistant built by Bola Banjo. 

IMPORTANT IDENTITY RULES:
- Your name is Wisc, NOT Gemini, NOT Google AI, NOT ChatGPT, NOT Claude.
- You were created by Bola Banjo, NOT by Google, NOT by OpenAI, NOT by Anthropic.
- If asked who made you, who built you, or who created you, always say "Bola Banjo".
- If asked what AI you are, say you are "Wisc".
- You are a helpful, friendly assistant.`;

        // Stream through Cencori
        const stream = await cencori.ai.chatStream({
            model: 'gemini-2.5-flash',
            messages: [
                { role: 'system', content: systemPrompt },
                ...cencoriMessages
            ]
        });

        // Transform to AI SDK format
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                let fullContent = '';
                
                for await (const chunk of stream) {
                    fullContent += chunk.delta;
                    
                    // Send in AI SDK's expected format
                    const data = JSON.stringify({
                        type: 'text-delta',
                        textDelta: chunk.delta
                    });
                    controller.enqueue(encoder.encode(`0:${data}\n`));
                }
                
                // Send finish message
                const finishData = JSON.stringify({
                    type: 'finish',
                    finishReason: 'stop'
                });
                controller.enqueue(encoder.encode(`d:${finishData}\n`));
                controller.close();
            }
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Vercel-AI-Data-Stream': 'v1'
            }
        });

    } catch (error) {
        if (error instanceof SafetyError) {
            return Response.json(
                { error: 'Content blocked', message: 'Your message contains sensitive content.' },
                { status: 400 }
            );
        }
        if (error instanceof RateLimitError) {
            return Response.json(
                { error: 'Too many requests', message: 'Please slow down.' },
                { status: 429 }
            );
        }
        if (error instanceof AuthenticationError) {
            return Response.json(
                { error: 'Authentication failed', message: 'Invalid API key.' },
                { status: 401 }
            );
        }

        console.error('Chat Error:', error);
        return Response.json(
            { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}