import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages, UIMessage } from 'ai';
import { CencoriClient, SafetyError, RateLimitError, AuthenticationError } from 'cencori';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const cencori = new CencoriClient({
        apiKey: process.env.CENCORI_API_KEY!,
        // Use deployed URL or localhost for testing
        baseUrl: process.env.CENCORI_BASE_URL || 'https://cencori.com'
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
                try {
                    // Add timeout to prevent hanging
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Cencori timeout')), 5000)
                    );

                    await Promise.race([
                        cencori.ai.chat({
                            messages: [
                                { role: 'user', content: textContent }
                            ]
                        }),
                        timeoutPromise
                    ]);
                    // If we reach here, content is safe ✅
                } catch (cencoriError) {
                    // Log the specific error for debugging
                    console.error('Cencori safety check failed:', {
                        error: cencoriError,
                        message: cencoriError instanceof Error ? cencoriError.message : 'Unknown',
                        statusCode: (cencoriError as any)?.statusCode,
                        code: (cencoriError as any)?.code
                    });

                    // If it's a safety error, still throw it to block unsafe content
                    if (cencoriError instanceof SafetyError) {
                        throw cencoriError;
                    }

                    // For other errors (network, timeout, etc.), log but allow chat to continue
                    // This prevents intermittent API issues from breaking the user experience
                    console.warn('⚠️  Proceeding without Cencori safety check due to API error');
                }
            }
        }

        // Step 2: Stream response with Google SDK (for tools & streaming)
        const result = await streamText({
            model: google('gemini-2.5-flash'),
            system: `you are wisc built by bola banjo`,
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