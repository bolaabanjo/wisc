# Wisc AI Chat

This is an AI chat application named `Wisc` built with [Next.js](https://nextjs.org), the [Vercel AI SDK](https://aisdk.dev), and [Google Generative AI](https://ai.google.dev).

## Features

- **Real-time AI Chat:** Engage in conversations with a Google Generative AI model.
- **Streaming Responses:** AI responses are streamed in real-time for a smooth user experience.
- **Intuitive UI:** User messages are displayed on the right, and AI responses on the left for easy readability.

## Getting Started

First, set up your Google Generative AI API Key. Create a `.env.local` file in the root of your project and add your API key:

```
GOOGLE_GENERATIVE_AI_API_KEY="YOUR_API_KEY"
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
