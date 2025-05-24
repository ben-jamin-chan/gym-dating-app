/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth as a Date object or ISO string
 * @returns Age in years
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // If the birth month hasn't occurred this year, or if it's the birth month but the day hasn't occurred
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Format a date for display in date picker
 * @param date - Date object
 * @returns Formatted date string
 */
export function formatDateForPicker(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Check if a date string is a valid date
 * @param dateString - Date string to validate
 * @returns True if valid date, false otherwise
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Get minimum date for date of birth (18 years ago)
 * @returns Date object representing 18 years ago
 */
export function getMinDateOfBirth(): Date {
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 18);
  return minDate;
}

/**
 * Get maximum date for date of birth (100 years ago)
 * @returns Date object representing 100 years ago
 */
export function getMaxDateOfBirth(): Date {
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 100);
  return maxDate;
} 