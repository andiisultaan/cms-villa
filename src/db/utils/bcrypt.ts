import bcryptjs from "bcryptjs";

/**
 * Hash teks (biasanya password) menggunakan bcryptjs
 */
export const hashText = (text: string): string => bcryptjs.hashSync(text);

/**
 * Bandingkan teks dengan hash yang tersimpan
 */
export const compareTextWithHash = (text: string, hash: string): boolean => bcryptjs.compareSync(text, hash);
