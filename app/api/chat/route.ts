import { cencori } from "@cencori/ai-provider";
import { streamText, UIMessage, convertToModelMessages } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = await streamText({
        model: cencori("gemini-2.5-flash"),
        messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
}
