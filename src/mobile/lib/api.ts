import axios from 'axios';
import { Platform } from 'react-native';

const DEFAULT_LOCAL_ANDROID_API_URL = 'http://10.0.2.2:4000/api';
const DEFAULT_LOCAL_API_URL = 'http://localhost:4000/api';
const DEFAULT_PRODUCTION_API_URL =
  'https://i-track-backend-0xpa.onrender.com/api';

const resolveBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (__DEV__) {
    if (Platform.OS === 'android') {
      return DEFAULT_LOCAL_ANDROID_API_URL;
    }

    return DEFAULT_LOCAL_API_URL;
  }

  return DEFAULT_PRODUCTION_API_URL;
};

export const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15000,
});

export const setApiAuthToken = (token: string | null) => {
  const normalizedToken = token?.trim();

  if (normalizedToken) {
    api.defaults.headers.common.Authorization = `Bearer ${normalizedToken}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
};

export const getResponseData = <T>(response: {
  data?: {
    data?: T;
    message?: string;
  };
}) => response.data?.data as T;

export const getResponseMessage = (response: {
  data?: {
    message?: string;
  };
}) => response.data?.message ?? '';

export const getApiErrorStatus = (error: unknown) =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.'
) => {
  if (axios.isAxiosError<{ message?: string; details?: string[] }>(error)) {
    const responseMessage = error.response?.data?.message?.trim();
    const responseDetail = error.response?.data?.details?.find((item) =>
      String(item ?? '').trim()
    );

    if (responseMessage) {
      return responseMessage;
    }

    if (responseDetail) {
      return responseDetail;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};
