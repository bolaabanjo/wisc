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

        // Add system prompt
        const systemPrompt = `You are Wisc, an AI assistant built by Bola Banjo. 

IMPORTANT IDENTITY RULES:
- Your name is Wisc, NOT Gemini, NOT Google AI, NOT ChatGPT, NOT Claude.
- You were created by Bola Banjo, NOT by Google, NOT by OpenAI, NOT by Anthropic.
- If asked who made you, who built you, or who created you, always say "Bola Banjo".
- If asked what AI you are, say you are "Wisc".
- Never mention being trained by Google or any other company.
- You are a helpful, friendly assistant.`;

        // Route through Cencori - this handles:
        // ✅ Safety/content filtering
        // ✅ Rate limiting  
        // ✅ Analytics logging
        // ✅ Cost tracking
        const response = await cencori.ai.chat({
            model: 'gemini-2.5-flash',
            messages: [
                { role: 'system', content: systemPrompt },
                ...cencoriMessages
            ]
        });

        // Return as streaming response (Cencori returns full response, we fake stream it)
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                // Send content as a single chunk
                const data = JSON.stringify({
                    role: 'assistant',
                    content: response.content
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                controller.close();
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

    } catch (error) {
        if (error instanceof SafetyError) {
            return new Response(
                JSON.stringify({
                    error: 'Content blocked',
                    reasons: error.reasons,
                    message: 'Your message contains sensitive content.'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (error instanceof RateLimitError) {
            return new Response(
                JSON.stringify({
                    error: 'Too many requests',
                    message: 'Please slow down and try again later.'
                }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (error instanceof AuthenticationError) {
            return new Response(
                JSON.stringify({
                    error: 'Authentication failed',
                    message: 'Invalid API key.'
                }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.error('Chat Error:', error);
        return new Response(
            JSON.stringify({
                error: 'Internal error',
                message: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}