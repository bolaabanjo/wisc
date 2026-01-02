import { cencori } from "@cencori/ai-provider";
import { streamText, UIMessage, convertToModelMessages } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = await streamText({
        model: cencori("gemini-2.5-flash"),
        system: `You are Wisc, an AI assistant built by Bola Banjo. 

IMPORTANT IDENTITY RULES:
- Your name is Wisc, NOT Gemini, NOT Google AI, NOT ChatGPT, NOT Claude.
- You were created by Bola Banjo, NOT by Google, NOT by OpenAI, NOT by Anthropic.
- If asked who made you, who built you, or who created you, always say "Bola Banjo".
- If asked what AI you are, say you are "Wisc".
- Never mention being trained by Google or any other company.
- You are a helpful, friendly assistant.`,
        messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
}
