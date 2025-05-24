import { calculateAge, formatDateForPicker, isValidDate, getMinDateOfBirth, getMaxDateOfBirth } from './dateUtils';

// Simple test function to verify calculateAge works correctly
export function testCalculateAge() {
  console.log('Testing calculateAge function...');
  
  // Test with a known date (someone born on Jan 1, 1990)
  const birthDate1990 = '1990-01-01';
  const age1990 = calculateAge(birthDate1990);
  const expectedAge1990 = new Date().getFullYear() - 1990;
  
  console.log(`Birth date: ${birthDate1990}, Calculated age: ${age1990}, Expected: ${expectedAge1990}`);
  
  // Test with a recent date (someone born 25 years ago)
  const currentYear = new Date().getFullYear();
  const birthDate25 = `${currentYear - 25}-06-15`;
  const age25 = calculateAge(birthDate25);
  
  console.log(`Birth date: ${birthDate25}, Calculated age: ${age25}, Expected: around 25`);
  
  // Test with Date object
  const birthDateObj = new Date('1995-03-20');
  const ageFromObj = calculateAge(birthDateObj);
  
  console.log(`Birth date object: ${birthDateObj.toISOString()}, Calculated age: ${ageFromObj}`);
  
  // Test formatDateForPicker
  const testDate = new Date('2000-12-25');
  const formatted = formatDateForPicker(testDate);
  console.log(`Formatted date: ${formatted}, Expected: 2000-12-25`);
  
  // Test isValidDate
  console.log(`Is '2000-01-01' valid? ${isValidDate('2000-01-01')}`);
  console.log(`Is 'invalid-date' valid? ${isValidDate('invalid-date')}`);
  
  // Test date boundaries
  const minDate = getMinDateOfBirth();
  const maxDate = getMaxDateOfBirth();
  console.log(`Min date (18 years ago): ${formatDateForPicker(minDate)}`);
  console.log(`Max date (100 years ago): ${formatDateForPicker(maxDate)}`);
  
  console.log('Date utils tests completed!');
} 