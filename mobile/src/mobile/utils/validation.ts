import {
  isValidMobilePhoneNumber,
  MOBILE_PHONE_VALIDATION_MESSAGE,
} from './phone';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 8 characters and include at least 1 uppercase letter, 1 number, and 1 special character.';

export class FormValidator {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): boolean {
    return PASSWORD_COMPLEXITY_REGEX.test(password);
  }

  static getPasswordRequirementsMessage(): string {
    return PASSWORD_REQUIREMENTS_MESSAGE;
  }

  static validatePhoneNumber(phone: string): boolean {
    return isValidMobilePhoneNumber(phone);
  }

  static validateURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static validateRequired(value: string | number | boolean): boolean {
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return true;
    return value.toString().trim().length > 0;
  }

  static validateMinLength(value: string, minLength: number): boolean {
    return value.length >= minLength;
  }

  static validateMaxLength(value: string, maxLength: number): boolean {
    return value.length <= maxLength;
  }

  static validateRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  static validatePattern(value: string, pattern: RegExp): boolean {
    return pattern.test(value);
  }

  // Form validation
  static validateSignIn(formData: {
    email: string;
    password: string;
  }): ValidationResult {
    const errors: Record<string, string> = {};

    if (!this.validateRequired(formData.email)) {
      errors.email = 'Email is required';
    } else if (!this.validateEmail(formData.email)) {
      errors.email = 'Invalid email address';
    }

    if (!this.validateRequired(formData.password)) {
      errors.password = 'Password is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  static validateSignUp(formData: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): ValidationResult {
    const errors: Record<string, string> = {};

    if (!this.validateRequired(formData.name)) {
      errors.name = 'Name is required';
    } else if (!this.validateMinLength(formData.name, 3)) {
      errors.name = 'Name must be at least 3 characters';
    }

    if (!this.validateRequired(formData.email)) {
      errors.email = 'Email is required';
    } else if (!this.validateEmail(formData.email)) {
      errors.email = 'Invalid email address';
    }

    if (!this.validateRequired(formData.password)) {
      errors.password = 'Password is required';
    } else if (!this.validatePassword(formData.password)) {
      errors.password = this.getPasswordRequirementsMessage();
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  static validateResetPassword(formData: {
    password: string;
    confirmPassword: string;
  }): ValidationResult {
    const errors: Record<string, string> = {};

    if (!this.validateRequired(formData.password)) {
      errors.password = 'Password is required';
    } else if (!this.validatePassword(formData.password)) {
      errors.password = this.getPasswordRequirementsMessage();
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  static validateVehicleForm(formData: {
    vehicleNumber: string;
    type: string;
    model: string;
    registrationNumber: string;
  }): ValidationResult {
    const errors: Record<string, string> = {};

    if (!this.validateRequired(formData.vehicleNumber)) {
      errors.vehicleNumber = 'Vehicle number is required';
    }

    if (!this.validateRequired(formData.type)) {
      errors.type = 'Vehicle type is required';
    }

    if (!this.validateRequired(formData.model)) {
      errors.model = 'Vehicle model is required';
    }

    if (!this.validateRequired(formData.registrationNumber)) {
      errors.registrationNumber = 'Registration number is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  static validateAllocationForm(formData: {
    driverId: string;
    vehicleId: string;
    destination: string;
    date: string;
  }): ValidationResult {
    const errors: Record<string, string> = {};

    if (!this.validateRequired(formData.driverId)) {
      errors.driverId = 'Driver is required';
    }

    if (!this.validateRequired(formData.vehicleId)) {
      errors.vehicleId = 'Vehicle is required';
    }

    if (!this.validateRequired(formData.destination)) {
      errors.destination = 'Destination is required';
    }

    if (!this.validateRequired(formData.date)) {
      errors.date = 'Date is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  static validateTestDriveForm(formData: {
    customerName: string;
    customerPhone: string;
    vehicleId: string;
    date: string;
    time: string;
  }): ValidationResult {
    const errors: Record<string, string> = {};

    if (!this.validateRequired(formData.customerName)) {
      errors.customerName = 'Customer name is required';
    }

    if (!this.validateRequired(formData.customerPhone)) {
      errors.customerPhone = 'Phone number is required';
    } else if (!this.validatePhoneNumber(formData.customerPhone)) {
      errors.customerPhone = MOBILE_PHONE_VALIDATION_MESSAGE;
    }

    if (!this.validateRequired(formData.vehicleId)) {
      errors.vehicleId = 'Vehicle is required';
    }

    if (!this.validateRequired(formData.date)) {
      errors.date = 'Date is required';
    }

    if (!this.validateRequired(formData.time)) {
      errors.time = 'Time is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

export default FormValidator;
