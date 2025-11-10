import { google } from '@ai-sdk/google';
import { streamText, UIMessage, convertToModelMessages, NoSuchToolError, InvalidToolInputError } from 'ai';
import { googleTools } from '@ai-sdk/google/internal';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
        model: google('gemini-2.5-flash'),
        system: 'You are wisc, an AI application built by Bola Banjo. You are designed to engage in natural, informative, and creative conversations. Your purpose is to provide helpful, concise, and accurate responses to user queries across a wide range of topics, leveraging your vast knowledge base. Always strive to be informative, efficient, and user-centric.',
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