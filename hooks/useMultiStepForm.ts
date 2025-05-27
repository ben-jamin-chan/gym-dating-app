import { useState, useCallback } from 'react';

export interface FormStep {
  title: string;
  description: string;
  fields: string[];
  isOptional?: boolean;
  validate?: (values: Record<string, any>) => string[] | null;
}

export interface UseMultiStepFormOptions {
  steps: FormStep[];
  initialValues?: Record<string, any>;
  onSubmit?: (values: Record<string, any>) => Promise<void>;
  onStepChange?: (currentStep: number, direction: 'next' | 'back') => void;
  validateOnChange?: boolean;
}

export interface UseMultiStepFormReturn {
  // Current state
  currentStep: number;
  currentStepConfig: FormStep;
  isFirstStep: boolean;
  isLastStep: boolean;
  totalSteps: number;
  
  // Form values
  values: Record<string, any>;
  errors: Record<string, string[]>;
  
  // Progress
  progress: number;
  completedSteps: number[];
  
  // Actions
  nextStep: () => Promise<boolean>;
  previousStep: () => void;
  goToStep: (step: number) => void;
  setValue: (field: string, value: any) => void;
  setValues: (values: Record<string, any>) => void;
  validateCurrentStep: () => string[] | null;
  validateAllSteps: () => boolean;
  submitForm: () => Promise<void>;
  reset: () => void;
  
  // State flags
  isSubmitting: boolean;
  canProceed: boolean;
}

export function useMultiStepForm({
  steps,
  initialValues = {},
  onSubmit,
  onStepChange,
  validateOnChange = true
}: UseMultiStepFormOptions): UseMultiStepFormReturn {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepConfig = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Validate current step
  const validateCurrentStep = useCallback((): string[] | null => {
    const stepConfig = steps[currentStep];
    if (!stepConfig) return null;

    // Custom validation function
    if (stepConfig.validate) {
      const stepErrors = stepConfig.validate(values);
      if (stepErrors && stepErrors.length > 0) {
        setErrors(prev => ({
          ...prev,
          [currentStep]: stepErrors
        }));
        return stepErrors;
      }
    }

    // Default required field validation
    const missingFields: string[] = [];
    if (!stepConfig.isOptional) {
      stepConfig.fields.forEach(field => {
        const value = values[field];
        if (value === undefined || value === null || value === '') {
          missingFields.push(field);
        }
        // Check for empty arrays
        if (Array.isArray(value) && value.length === 0) {
          missingFields.push(field);
        }
      });
    }

    if (missingFields.length > 0) {
      const errorMessages = missingFields.map(field => `${field} is required`);
      setErrors(prev => ({
        ...prev,
        [currentStep]: errorMessages
      }));
      return errorMessages;
    }

    // Clear errors for this step
    setErrors(prev => {
      const { [currentStep]: removed, ...rest } = prev;
      return rest;
    });

    return null;
  }, [currentStep, steps, values]);

  // Validate all steps
  const validateAllSteps = useCallback((): boolean => {
    let allValid = true;
    const allErrors: Record<string, string[]> = {};

    steps.forEach((step, index) => {
      if (step.validate) {
        const stepErrors = step.validate(values);
        if (stepErrors && stepErrors.length > 0) {
          allErrors[index] = stepErrors;
          allValid = false;
        }
      } else if (!step.isOptional) {
        const missingFields: string[] = [];
        step.fields.forEach(field => {
          const value = values[field];
          if (value === undefined || value === null || value === '') {
            missingFields.push(field);
          }
          if (Array.isArray(value) && value.length === 0) {
            missingFields.push(field);
          }
        });

        if (missingFields.length > 0) {
          allErrors[index] = missingFields.map(field => `${field} is required`);
          allValid = false;
        }
      }
    });

    setErrors(allErrors);
    return allValid;
  }, [steps, values]);

  // Check if current step is complete and can proceed
  const canProceed = useCallback(() => {
    const stepErrors = validateCurrentStep();
    return !stepErrors || stepErrors.length === 0;
  }, [validateCurrentStep]);

  // Set single value
  const setValue = useCallback((field: string, value: any) => {
    setValues(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate on change if enabled
    if (validateOnChange) {
      setTimeout(validateCurrentStep, 0);
    }
  }, [validateCurrentStep, validateOnChange]);

  // Set multiple values
  const setFormValues = useCallback((newValues: Record<string, any>) => {
    setValues(prev => ({
      ...prev,
      ...newValues
    }));

    if (validateOnChange) {
      setTimeout(validateCurrentStep, 0);
    }
  }, [validateCurrentStep, validateOnChange]);

  // Next step
  const nextStep = useCallback(async (): Promise<boolean> => {
    const validationErrors = validateCurrentStep();
    if (validationErrors && validationErrors.length > 0) {
      return false;
    }

    // Mark current step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }

    if (isLastStep) {
      // Submit form on last step
      if (onSubmit) {
        try {
          setIsSubmitting(true);
          await onSubmit(values);
          return true;
        } catch (error) {
          console.error('Form submission error:', error);
          return false;
        } finally {
          setIsSubmitting(false);
        }
      }
      return true;
    } else {
      // Move to next step
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      onStepChange?.(nextStepIndex, 'next');
      return true;
    }
  }, [currentStep, isLastStep, validateCurrentStep, completedSteps, onSubmit, values, onStepChange]);

  // Previous step
  const previousStep = useCallback(() => {
    if (!isFirstStep) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      onStepChange?.(prevStepIndex, 'back');
    }
  }, [currentStep, isFirstStep, onStepChange]);

  // Go to specific step
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
      onStepChange?.(step, step > currentStep ? 'next' : 'back');
    }
  }, [totalSteps, currentStep, onStepChange]);

  // Submit form
  const submitForm = useCallback(async () => {
    if (!validateAllSteps()) {
      throw new Error('Form validation failed');
    }

    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [validateAllSteps, onSubmit, values]);

  // Reset form
  const reset = useCallback(() => {
    setCurrentStep(0);
    setValues(initialValues);
    setErrors({});
    setCompletedSteps([]);
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    // Current state
    currentStep,
    currentStepConfig,
    isFirstStep,
    isLastStep,
    totalSteps,
    
    // Form values
    values,
    errors,
    
    // Progress
    progress,
    completedSteps,
    
    // Actions
    nextStep,
    previousStep,
    goToStep,
    setValue,
    setValues: setFormValues,
    validateCurrentStep,
    validateAllSteps,
    submitForm,
    reset,
    
    // State flags
    isSubmitting,
    canProceed: canProceed()
  };
} 