import { useMemo } from 'react';

const DIGIT_REGEX = /\d/;
const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /\d/;
const SPECIAL_REGEX = /[^A-Za-z0-9]/;
const WHITESPACE_REGEX = /\s/;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hasLongDigitSequence = (value: string) => {
  let run = 1;
  let lastDigit: number | null = null;

  for (const char of value) {
    const digit = Number.isNaN(Number(char)) ? null : Number(char);
    if (digit === null) {
      run = 1;
      lastDigit = null;
      continue;
    }

    if (lastDigit !== null && digit === lastDigit + 1) {
      run += 1;
      if (run > 3) {
        return true;
      }
    } else {
      run = 1;
    }
    lastDigit = digit;
  }

  return false;
};

interface UseSignupValidationParams {
  phone: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const useSignupValidation = ({
  phone,
  name,
  email,
  password,
  confirmPassword,
}: UseSignupValidationParams) => {
  const trimmedPhone = phone.replace(/\D/g, '').slice(0, 9);

  return useMemo(() => {
    const phoneValid = trimmedPhone.length === 9;
    const nameValid = !DIGIT_REGEX.test(name) && name.length > 0;
    const emailValid = email.length > 0 && EMAIL_REGEX.test(email.toLowerCase());
    const passwordValid =
      password.length > 0 &&
      UPPERCASE_REGEX.test(password) &&
      NUMBER_REGEX.test(password) &&
      SPECIAL_REGEX.test(password) &&
      !WHITESPACE_REGEX.test(password) &&
      !hasLongDigitSequence(password);
    const confirmValid = confirmPassword.length > 0 && password === confirmPassword;

    return {
      values: {
        phone: trimmedPhone,
      },
      flags: {
        phoneValid,
        nameValid,
        emailValid,
        passwordRules: {
          uppercase: UPPERCASE_REGEX.test(password),
          number: NUMBER_REGEX.test(password),
          special: SPECIAL_REGEX.test(password),
          noSpaces: !WHITESPACE_REGEX.test(password) && password.length > 0,
          noSequence: !hasLongDigitSequence(password),
        },
        passwordValid,
        confirmValid,
      },
    };
  }, [confirmPassword, email, name, password, trimmedPhone]);
};

export type SignupValidationResult = ReturnType<typeof useSignupValidation>;

