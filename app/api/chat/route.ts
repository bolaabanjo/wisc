import { google } from '@ai-sdk/google';
import { streamText, UIMessage, convertToModelMessages, NoSuchToolError, InvalidToolInputError } from 'ai';
import { googleTools } from '@ai-sdk/google/internal';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
        model: google('gemini-2.5-flash'),
        messages: convertToModelMessages(messages),
        tools: {
            google_search: google.tools.googleSearch({}),
        },
    });

    return result.toUIMessageStreamResponse({
        onError: error => {
            if (NoSuchToolError.isInstance(error)) {
                return 'The model tried to call an unknown tool.';
            } else if (InvalidToolInputError.isInstance(error)) {
                return 'The model called a tool with invalid inputs.';
            } else {
                return 'An unknown error occurred.';
            }
        },
    });
}