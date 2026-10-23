import axios from 'axios';
import { Alert } from 'react-native';
import { getApiErrorMessage } from './api';

export async function runOperationalAction(action: () => Promise<void>) {
  try { await action(); }
  catch (error) {
    if (!axios.isCancel(error)) Alert.alert('Action not completed', getApiErrorMessage(error, 'Refresh this record and try again.'));
  }
}
