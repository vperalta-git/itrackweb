import { useState, useCallback } from 'react';
import { ValidationResult } from '../utils/validation';

export interface FormState<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void> | void;
  validate?: (values: T) => ValidationResult;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
) {
  const {
    initialValues,
    onSubmit,
    validate,
    validateOnChange = false,
    validateOnBlur = true,
  } = options;

  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isDirty: false,
  });

  const setFieldValue = useCallback(
    (fieldName: keyof T, value: any) => {
      setFormState((prev) => {
        const newValues = { ...prev.values, [fieldName]: value };
        const newState = {
          ...prev,
          values: newValues,
          isDirty: true,
        };

        if (validateOnChange && validate) {
          const validation = validate(newValues);
          newState.errors = validation.errors;
        }

        return newState;
      });
    },
    [validate, validateOnChange]
  );

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setFormState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [fieldName]: error },
    }));
  }, []);

  const setFieldTouched = useCallback(
    (fieldName: string) => {
      setFormState((prev) => {
        const newTouched = { ...prev.touched, [fieldName]: true };
        const newState = { ...prev, touched: newTouched };

        if (validateOnBlur && validate) {
          const validation = validate(prev.values);
          newState.errors = validation.errors;
        }

        return newState;
      });
    },
    [validate, validateOnBlur]
  );

  const resetForm = useCallback(() => {
    setFormState({
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isDirty: false,
    });
  }, [initialValues]);

  const handleSubmit = useCallback(
    async (e?: any) => {
      if (e && e.preventDefault) {
        e.preventDefault();
      }

      let validation: ValidationResult | null = null;

      if (validate) {
        validation = validate(formState.values);

        if (!validation.isValid) {
          setFormState((prev) => ({
            ...prev,
            errors: validation!.errors,
          }));
          return;
        }
      }

      setFormState((prev) => ({ ...prev, isSubmitting: true }));

      try {
        await onSubmit(formState.values);
      } catch (error) {
        console.error('[v0] Form submission error:', error);
      } finally {
        setFormState((prev) => ({ ...prev, isSubmitting: false }));
      }
    },
    [formState.values, onSubmit, validate]
  );

  const getFieldProps = useCallback(
    (fieldName: keyof T) => ({
      value: formState.values[fieldName],
      onChangeText: (value: any) => setFieldValue(fieldName, value),
      onBlur: () => setFieldTouched(fieldName as string),
      error: formState.errors[fieldName as string],
    }),
    [formState.values, formState.errors, setFieldValue, setFieldTouched]
  );

  return {
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    isSubmitting: formState.isSubmitting,
    isDirty: formState.isDirty,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    handleSubmit,
    resetForm,
    getFieldProps,
  };
}

export default useForm;
