import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';
import LocationRequirement from './src/components/LocationRequirement';

export default function App() {
  console.log('App render');
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ErrorBoundary>
          <LocationRequirement>
            <AppNavigator />
          </LocationRequirement>
        </ErrorBoundary>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
