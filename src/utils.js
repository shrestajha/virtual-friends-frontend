/**
 * Removes EI/CI information from character descriptions
 * Filters out patterns like "EI=3/10", "CI=5/10", "EI: 3/10", etc.
 */
export function filterEICI(description) {
  if (!description) return description;
  
  // Remove various patterns of EI/CI mentions
  let filtered = description
    // Remove "has EI=X/10 and CI=Y/10" patterns (most common, with optional punctuation)
    .replace(/\bhas\s+EI\s*[=:]\s*\d+\/10\s+and\s+CI\s*[=:]\s*\d+\/10\b\.?/gi, '')
    // Remove "EI=X/10 and CI=Y/10" patterns
    .replace(/\bEI\s*[=:]\s*\d+\/10\s+and\s+CI\s*[=:]\s*\d+\/10\b\.?/gi, '')
    // Remove "EI=X/10" or "EI: X/10" patterns (case insensitive)
    .replace(/\bEI\s*[=:]\s*\d+\/10\b\.?/gi, '')
    // Remove "CI=X/10" or "CI: X/10" patterns (case insensitive)
    .replace(/\bCI\s*[=:]\s*\d+\/10\b\.?/gi, '')
    // Remove "Emotional Intelligence: X/10" patterns
    .replace(/\bEmotional\s+Intelligence\s*[=:]\s*\d+\/10\b\.?/gi, '')
    // Remove "Cognitive Intelligence: X/10" patterns
    .replace(/\bCognitive\s+Intelligence\s*[=:]\s*\d+\/10\b\.?/gi, '')
    // Clean up "character ." -> "character."
    .replace(/\bcharacter\s+\./gi, 'character.')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    // Clean up double periods/commas
    .replace(/\s*[.,]\s*[.,]+/g, '.')
    // Clean up period/comma followed by period
    .replace(/[.,]\s*\./g, '.')
    .trim();
  
  // Remove leading/trailing punctuation if it's just a period or comma
  filtered = filtered.replace(/^[.,]\s*/, '').replace(/\s*[.,]$/, '');
  
  // If filtered is empty or just whitespace, return original
  if (!filtered || filtered.trim().length === 0) {
    return description;
  }
  
  return filtered;
}

