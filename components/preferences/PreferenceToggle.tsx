import React from 'react';

interface PreferenceToggleProps {
  options: string[];
  selectedOptions: string[];
  onToggle: (option: string) => void;
  allOption?: boolean;
}

export const usePreferenceToggle = (initialValue: string[] = ['All']) => {
  const [selectedOptions, setSelectedOptions] = React.useState<string[]>(initialValue);

  const toggleOption = React.useCallback((option: string) => {
    if (option === 'All') {
      setSelectedOptions(['All']);
    } else {
      // If 'All' is currently selected and user selects a specific option
      if (selectedOptions.includes('All')) {
        setSelectedOptions([option]);
      } else {
        // Toggle the selected option
        if (selectedOptions.includes(option)) {
          // Don't allow removing the last selected option
          if (selectedOptions.length > 1) {
            setSelectedOptions(selectedOptions.filter(o => o !== option));
          }
        } else {
          setSelectedOptions([...selectedOptions, option]);
        }
      }
    }
  }, [selectedOptions]);

  return {
    selectedOptions,
    setSelectedOptions,
    toggleOption
  };
};

export default function PreferenceToggle({ 
  options, 
  selectedOptions, 
  onToggle 
}: PreferenceToggleProps) {
  return null; // This hook doesn't render anything
} 