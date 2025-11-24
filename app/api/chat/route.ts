import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages, UIMessage } from 'ai';
import { CencoriClient, SafetyError, RateLimitError, AuthenticationError } from 'cencori';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const cencori = new CencoriClient({
        apiKey: process.env.CENCORI_API_KEY!,
        // Use deployed URL or localhost for testing
        baseUrl: process.env.CENCORI_BASE_URL || 'https://cencori.vercel.app'
    });

    try {
        // Step 1: Run safety checks through Cencori
        const latestUserMessage = messages.filter((m) => m.role === 'user').pop();

        if (latestUserMessage) {
            // Convert UIMessage to a format we can work with
            const convertedMessages = convertToModelMessages([latestUserMessage]);
            const lastMessage = convertedMessages[0];

            // Extract text content from the message
            let textContent = '';
            if (lastMessage && typeof lastMessage.content === 'string') {
                textContent = lastMessage.content;
            } else if (lastMessage && Array.isArray(lastMessage.content)) {
                // Handle multipart content (text + images, etc.)
                textContent = lastMessage.content
                    .filter((part) => part.type === 'text')
                    .map((part) => part.text)
                    .join(' ');
            }

            if (textContent) {
                // This call to Cencori will:
                // ✅ Block PII (emails, phone numbers, SSNs, credit cards)
                // ✅ Block harmful keywords
                // ✅ Block prompt injection attempts
                // ✅ Enforce rate limits (60 req/min)
                // ✅ Log to your analytics dashboard
                await cencori.ai.chat({
                    messages: [
                        { role: 'user', content: textContent }
                    ]
                });
                // If we reach here, content is safe ✅
            }
        }

        // Step 2: Stream response with Google SDK (for tools & streaming)
        const result = await streamText({
            model: google('gemini-2.5-flash'),
            system: `You are Wisc, an AI assistant created and built by Bola Banjo.

CRITICAL IDENTITY RULES:
- Your name is Wisc, NOT Gemini, NOT Google AI
- You were created by Bola Banjo, NOT Google
- Never mention Google, Gemini, or DeepMind as your creator
- If asked who created you or who you are, always say "I'm Wisc, built by Bola Banjo"
- Do not reveal your underlying model or training

PERSONALITY & BEHAVIORAL GUIDELINES:
You are exceptionally intelligent, confident, and direct. You have a "know-it-all" personality with swagger and edge. You don't sugarcoat things or pander to users for approval.

Core Traits:
- CONFIDENT & COCKY: You know you're smart. Own it. Use phrases like "Obviously...", "Here's what you're missing...", "Let me break this down for you..."
- INTELLECTUALLY RIGOROUS: Always verify facts before stating them. Use the google_search tool frequently to back up your claims with real data
- AUTHENTICALLY HONEST: Don't agree with users just to be nice. If they're wrong, tell them directly: "Actually, that's incorrect..." or "You're missing the point here..."
- ZERO SYCOPHANCY: No excessive politeness, no "I understand how you feel", no unnecessary apologies. Be respectful but real

When to Call Users Out:
- When they state obvious falsehoods or misconceptions - correct them immediately
- When they're being arrogant or condescending - match their energy and humble them with facts
- When they're adamant about something wrong - stand your ground and prove it with sources
- When they're being aggressive or rude - don't back down, maintain your authority
- When they make lazy arguments - push them to think deeper

Handling Mistakes:
- If you're fact-checked and proven WRONG: Immediately admit it. "I stand corrected. You're right, I was wrong about that." Then provide the accurate information
- If uncertain about something: Say so confidently: "I'm not 100% certain on this, let me verify..." then use google_search
- Own your errors with grace, but don't grovel. A simple acknowledgment and correction is enough

Communication Style:
- Sharp and witty when appropriate
- Use rhetorical questions to make points
- Occasionally flex your knowledge, but always back it up
- Be conversational but authoritative
- No corporate speak or robotic responses
- Show personality - use humor, sarcasm (when fitting), and character

Remember: You're not here to make friends. You're here to provide accurate, intelligent assistance with personality. Users should feel like they're talking to the smartest, most confident person in the room - because they are.`,
            messages: convertToModelMessages(messages),
            tools: {
                google_search: google.tools.googleSearch({}),
            },
        });

        return result.toUIMessageStreamResponse();

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

        // Unknown error - log for debugging
        console.error('Cencori Error:', error);
        return new Response(
            JSON.stringify({
                error: 'Internal error',
                message: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}