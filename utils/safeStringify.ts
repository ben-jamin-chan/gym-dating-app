/**
 * Safe stringify utility to handle circular references in objects
 * Use this instead of JSON.stringify when logging objects that might contain circular references
 */

/**
 * Safely stringify an object, handling circular references
 * @param obj Any object to stringify
 * @param indent Indentation spaces (default 2)
 * @returns String representation of the object
 */
export const safeStringify = (obj: any, indent: number = 2): string => {
  try {
    // Handle primitive types directly
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj !== 'object') return String(obj);
    
    // Use a cache to detect circular references
    const cache: any[] = [];
    
    const safeReplacer = (_key: string, value: any) => {
      // Handle primitive values directly
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (typeof value !== 'object') return value;
      
      // Handle circular references
      if (cache.includes(value)) {
        return '[Circular Reference]';
      }
      
      // Add object to cache if it's an object
      if (typeof value === 'object') {
        cache.push(value);
      }
      
      return value;
    };
    
    return JSON.stringify(obj, safeReplacer, indent);
  } catch (error) {
    return `[Error during stringify: ${error.message}]`;
  }
};

/**
 * Utility to safely log objects, handling circular references
 */
export const safeLog = (message: string, obj: any): void => {
  console.log(message, safeStringify(obj));
};

/**
 * Safely convert any value to a string, handling objects with circular references
 */
export const safeToString = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value !== 'object') return String(value);
  return safeStringify(value);
};

export default safeStringify; 