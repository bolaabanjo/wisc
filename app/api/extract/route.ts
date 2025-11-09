import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const maxDuration = 30;

const userMessageSchema = z.object({
  personName: z.string().describe("The name of a person mentioned in the message, if any.").nullable(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).describe("The sentiment of the user's message."),
  keywords: z.array(z.string()).describe("A list of keywords from the message."),
});

export async function POST(req: Request) {
  const { message }: { message: string } = await req.json();

  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: userMessageSchema,
    prompt: `Analyze the following message and extract the person's name, sentiment, and keywords: ${message}`,
  });

  return new Response(JSON.stringify(object), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
