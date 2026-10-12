export const normalizeArabic = (text: string): string => {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    // Remove Arabic diacritics (tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // Normalize alefs
    .replace(/[أإآٱ]/g, "ا")
    // Normalize taa marbuta
    .replace(/ة/g, "ه")
    // Normalize yaa & alef maqsura
    .replace(/[ىي]/g, "ي");
};

export const normalizeText = normalizeArabic;

/**
 * Checks if all query tokens are included in the target text,
 * regardless of order or consecutive sequence, matching partial words.
 */
export const isSmartMatch = (text: string, query: string): boolean => {
  if (!query || !query.trim()) return true;
  if (!text) return false;
  
  const normalizedQuery = normalizeArabic(query);
  const tokens = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
  const normalizedTarget = normalizeArabic(text);
  
  return tokens.every(token => normalizedTarget.includes(token));
};
