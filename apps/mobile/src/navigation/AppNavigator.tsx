import React from 'react';
import { enableScreens } from 'react-native-screens';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import AvailabilityScreen from '../screens/AvailabilityScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChatThreadScreen from '../screens/ChatThreadScreen';
import IncidentReportCreateScreen from '../screens/IncidentReportCreateScreen';
import IncidentReportHistoryScreen from '../screens/IncidentReportHistoryScreen';
import IncidentReportDetailScreen from '../screens/IncidentReportDetailScreen';
import { useAuth } from '../context/AuthContext';
import { addNotificationResponseListener, configureExpoNotifications } from '../services/push';
import { connectChatPresence, disconnectChatPresence } from '../services/chatPresence';
import { navigationRef, navigate } from './NavigationService';
import { useEffect } from 'react';

enableScreens(false);
const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();
  console.log('AppNavigator render', { loading, hasUser: !!user });
  useEffect(() => {
    let sub: any;
    const setup = async () => {
      await configureExpoNotifications();
      sub = await addNotificationResponseListener((url?: string) => {
        const raw = String(url || '');
        const threadIdMatch = raw.match(/[?&]threadId=([^&]+)/);
        if (threadIdMatch?.[1]) {
          const threadId = decodeURIComponent(threadIdMatch[1]);
          navigate('ChatThread', { threadId });
          return;
        }
        if (raw.includes('/dashboard/time')) {
          navigate('Home');
          return;
        }
        if (raw.includes('/dashboard/communications/chats')) {
          navigate('Chat');
          return;
        }
        if (raw.includes('/dashboard/profile') || raw.includes('qualifications')) {
          navigate('Profile');
          return;
        }
        navigate('Schedule');
      });
    };
    setup();
    return () => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      disconnectChatPresence();
      return;
    }

    (async () => {
      const [token, storedBusinessId] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('businessId'),
      ]);
      if (cancelled || !token) return;
      connectChatPresence(token, user?.businessId || storedBusinessId || '');
    })();

    return () => {
      cancelled = true;
      disconnectChatPresence();
    };
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const initialRouteName = user ? 'Main' : 'Login';
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => console.log('Navigation ready')}
      onStateChange={() => console.log('Navigation state changed')}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="Availability" component={AvailabilityScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
            <Stack.Screen name="IncidentReportCreate" component={IncidentReportCreateScreen} />
            <Stack.Screen name="IncidentReportHistory" component={IncidentReportHistoryScreen} />
            <Stack.Screen name="IncidentReportDetail" component={IncidentReportDetailScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
