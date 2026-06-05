import React, { useEffect, useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import DashboardScreen from '../screens/DashboardScreen';
import SchedulingScreen from '../screens/SchedulingScreen';
import ChatScreen from '../screens/ChatScreen';
import LeaveScreen from '../screens/LeaveScreen';
import PayslipScreen from '../screens/PayslipScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CalloutHistoryScreen from '../screens/CalloutHistoryScreen';
import { Ionicons } from '@expo/vector-icons';
import { AppState } from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const ScheduleStack = createStackNavigator();

const tabPalette = {
  bg: '#000000',
  border: 'rgba(255,255,255,0.10)',
  active: '#A855F7',
  inactive: 'rgba(232,238,249,0.55)',
};

function ScheduleNavigator() {
  return (
    <ScheduleStack.Navigator screenOptions={{ headerShown: false }}>
      <ScheduleStack.Screen name="ScheduleHome" component={SchedulingScreen} />
      <ScheduleStack.Screen name="CalloutHistory" component={CalloutHistoryScreen} />
    </ScheduleStack.Navigator>
  );
}

function OnboardingGateScreen() {
  const formsUrl = useMemo(() => {
    const apiBase = String((api.defaults as any).baseURL || '').replace(/\/$/, '');
    let webBase = apiBase;
    if (webBase.includes(':3002')) webBase = webBase.replace(':3002', ':3000');
    webBase = webBase.replace(/\/api$/i, '');
    if (!webBase) webBase = 'http://localhost:3000';
    return `${webBase}/dashboard/forms`;
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#050816', padding: 20, justifyContent: 'center' }}>
      <View style={{ borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: '#0B1224', padding: 16 }}>
        <Text style={{ color: '#E8EEF9', fontSize: 18, fontWeight: '900' }}>Onboarding required</Text>
        <Text style={{ marginTop: 10, color: 'rgba(232,238,249,0.66)', fontSize: 13, fontWeight: '700', lineHeight: 18 }}>
          Your account is in onboarding status. Complete your employment forms to continue.
        </Text>
        <TouchableOpacity
          onPress={async () => {
            try {
              await Linking.openURL(formsUrl);
            } catch {
              Alert.alert('Unable to open', 'Could not open the web onboarding forms link.');
            }
          }}
          style={{
            marginTop: 14,
            height: 46,
            borderRadius: 16,
            backgroundColor: '#4F46E5',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '900' }}>Open employment forms</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MainTabNavigator() {
  const { user } = useAuth();
  const [unreadChats, setUnreadChats] = useState(0);
  const isOnboardingEmployee = useMemo(() => {
    const roleUpper = String(user?.employeeRole || user?.role || '').toUpperCase();
    const typeUpper = String(user?.employeeType || '').toUpperCase();
    return roleUpper === 'EMPLOYEE' && typeUpper === 'ONBOARDING';
  }, [user?.employeeRole, user?.employeeType, user?.role]);

  useEffect(() => {
    let alive = true;

    const fetchUnreadChats = async () => {
      try {
        const res = await api.get('/chats/threads');
        if (!alive) return;
        const totalUnread = Array.isArray(res?.data)
          ? res.data.reduce((sum: number, thread: any) => sum + Math.max(0, Number(thread?.unreadCount || 0)), 0)
          : 0;
        setUnreadChats(totalUnread);
      } catch {
        if (alive) setUnreadChats(0);
      }
    };

    fetchUnreadChats();
    const id = setInterval(fetchUnreadChats, 15000);
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') fetchUnreadChats();
    });

    return () => {
      alive = false;
      clearInterval(id);
      appStateSub.remove();
    };
  }, []);

  if (isOnboardingEmployee) {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: tabPalette.bg,
            borderTopColor: tabPalette.border,
            height: 78,
            paddingTop: 8,
            paddingBottom: 12,
          },
          tabBarActiveTintColor: tabPalette.active,
          tabBarInactiveTintColor: tabPalette.inactive,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: 2,
          },
          tabBarIcon: ({ focused, color, size }) => {
            const name = focused ? 'document-text' : 'document-text-outline';
            return <Ionicons name={name as any} size={size ?? 22} color={color as any} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={OnboardingGateScreen} options={{ title: 'Onboarding' }} />
      </Tab.Navigator>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabPalette.bg,
          borderTopColor: tabPalette.border,
          height: 78,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarActiveTintColor: tabPalette.active,
        tabBarInactiveTintColor: tabPalette.inactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const name =
            route.name === 'Home'
              ? focused
                ? 'home'
                : 'home-outline'
              : route.name === 'Schedule'
                ? focused
                  ? 'grid'
                  : 'grid-outline'
                : route.name === 'Chat'
                  ? focused
                    ? 'chatbubbles'
                    : 'chatbubbles-outline'
                  : route.name === 'Leave'
                    ? focused
                      ? 'calendar'
                      : 'calendar-outline'
                    : route.name === 'Payslips'
                      ? focused
                        ? 'folder'
                        : 'folder-outline'
                      : focused
                        ? 'person'
                        : 'person-outline';
          return <Ionicons name={name as any} size={size ?? 22} color={color as any} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Schedule" component={ScheduleNavigator} />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarBadge: unreadChats > 0 ? (unreadChats > 99 ? '99+' : unreadChats) : undefined,
          tabBarBadgeStyle: { backgroundColor: '#A855F7', color: '#ffffff' },
        }}
      />
      <Tab.Screen name="Leave" component={LeaveScreen} />
      <Tab.Screen name="Payslips" component={PayslipScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
