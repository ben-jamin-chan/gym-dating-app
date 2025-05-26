// Centralized preference options used across settings and discovery screens
export const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'All'];
export const FREQUENCY_OPTIONS = ['Daily', '3-5x/week', '1-2x/week', 'Occasionally', 'All'];
export const INTENSITY_OPTIONS = ['Light', 'Moderate', 'Intense', 'Very Intense', 'All'];
export const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Late Night', 'Flexible', 'All'];

// Default preference values
export const DEFAULT_PREFERENCES = {
  ageRange: { min: 18, max: 45 },
  maxDistance: 25,
  selectedGenders: ['All'],
  selectedFrequencies: ['All'],
  selectedIntensities: ['All'],
  selectedTimes: ['All'],
  globalMode: false,
}; 