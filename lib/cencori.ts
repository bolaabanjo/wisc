import { Cencori } from 'cencori';

export const cencori = new Cencori({
  apiKey: process.env.CENCORI_API_KEY!,
  baseUrl: process.env.CENCORI_BASE_URL,
});