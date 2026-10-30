import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppUpdateReminder from './src/components/AppUpdateReminder';

export default function App() {
  console.log('App render');
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ErrorBoundary>
          <AppUpdateReminder />
          <AppNavigator />
        </ErrorBoundary>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
