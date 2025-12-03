// Centralized color utility for consistent theming across the app

// Varied color palette - same colors for both, differentiated by style (filled vs outlined)
const questionColors = [
  '#667eea', // Blue-purple
  '#48bb78', // Green
  '#ed8936', // Orange
  '#f56565', // Red
  '#9f7aea', // Purple
  '#38b2ac', // Teal
  '#ecc94b', // Yellow
  '#ed64a6', // Pink
  '#4299e1', // Sky blue
  '#fc8181', // Light red
  '#718096', // Gray
  '#4a5568', // Dark gray
];

// Economic uses same colors (filled)
const economicColors = questionColors;

// Non-Economic uses same colors (will be outlined via CSS)
const nonEconomicColors = questionColors;

// Special colors for specific questions
const specialColors = {
  'open1': '#9f7aea', // Purple for Equity + Inclusivity
  'open2': '#718096', // Gray for Other Priorities
};

/**
 * Check if a question should be displayed with outlined style (non-economic)
 * @param {string} economic - The economic classification
 * @returns {boolean} - True if should be outlined
 */
export const isOutlinedStyle = (economic) => {
  return economic === 'Non-Economic';
};

/**
 * Get the color for a question based on its ID and economic classification
 * @param {string} questionId - The question ID (e.g., 'qual1', 'quant1', 'open1')
 * @param {string} economic - The economic classification ('Economic' or 'Non-Economic')
 * @returns {string} - Hex color code
 */
export const getQuestionColor = (questionId, economic) => {
  // Check for special cases first
  if (specialColors[questionId]) {
    return specialColors[questionId];
  }
  
  // Extract numeric index from question ID
  const numericPart = questionId.replace(/\D/g, '');
  const colorIndex = numericPart ? parseInt(numericPart) % 10 : 0;
  
  // Return color based on economic classification
  if (economic === 'Economic') {
    return economicColors[colorIndex];
  } else if (economic === 'Non-Economic') {
    return nonEconomicColors[colorIndex];
  } else {
    // Fallback to economic colors for unknown classification
    return economicColors[colorIndex];
  }
};

/**
 * Get the CSS class name for a question's color
 * @param {string} questionId - The question ID
 * @param {string} economic - The economic classification
 * @returns {string} - CSS class name
 */
export const getQuestionColorClass = (questionId, economic) => {
  // Special cases
  if (questionId === 'open1') return 'issue-open1';
  if (questionId === 'open2') return 'issue-open2';
  
  // Extract numeric index
  const numericPart = questionId.replace(/\D/g, '');
  const colorIndex = numericPart ? parseInt(numericPart) % 10 : 0;
  
  if (economic === 'Economic') {
    return `economic-color-${colorIndex}`;
  } else if (economic === 'Non-Economic') {
    return `non-economic-color-${colorIndex}`;
  } else {
    // Fallback
    return `issue-${questionId}`;
  }
};

/**
 * Create a color map for all questions
 * @param {Array} questions - Array of question objects with id and economic fields
 * @returns {Object} - Map of questionId to color
 */
export const createQuestionColorMap = (questions) => {
  const colorMap = {};
  questions.forEach(question => {
    colorMap[question.id] = getQuestionColor(question.id, question.economic);
  });
  return colorMap;
};

