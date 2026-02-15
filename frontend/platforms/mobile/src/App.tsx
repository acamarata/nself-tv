import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';
import { APIProvider } from './services/APIProvider';
import { AuthProvider } from './services/AuthProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <APIProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </APIProvider>
    </SafeAreaProvider>
  );
}
