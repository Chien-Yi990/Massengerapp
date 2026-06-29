import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import AuthScreen from './screens/AuthScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatDetailScreen from './screens/ChatDetailScreen';
import FriendsScreen from './screens/FriendsScreen';
import ProfileScreen from './screens/ProfileScreen';
import TimelineScreen from './screens/TimelineScreen';
import { initDatabase, onAuthChange } from './services/database';
import { LocalUser } from './types';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const headerOptions = {
  headerStyle: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E5EA',
    borderBottomWidth: 1,
  },
  headerTintColor: '#000',
  headerTitleStyle: {
    fontWeight: '600' as const,
  },
};

const ChatStack = () => (
  <Stack.Navigator screenOptions={headerOptions}>
    <Stack.Screen
      name="ChatListScreen"
      component={ChatListScreen}
      options={{ title: '聊天室', headerBackTitle: '返回' }}
    />
    <Stack.Screen
      name="ChatDetail"
      component={ChatDetailScreen}
      options={({ route }: any) => ({
        title: route.params.chatName,
        headerBackTitle: '返回',
      })}
    />
  </Stack.Navigator>
);

export default function App() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};

    initDatabase()
      .then(() => {
        unsubscribe = onAuthChange((nextUser) => {
          setUser(nextUser);
          setBooting(false);
        });
      })
      .catch(() => setBooting(false));

    return () => unsubscribe();
  }, []);

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#0A66C2" size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#0A66C2',
          tabBarInactiveTintColor: '#65676B',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E5E5EA',
            borderTopWidth: 1,
          },
        }}
      >
        <Tab.Screen
          name="ChatListTab"
          component={ChatStack}
          options={{
            tabBarLabel: '聊天',
            tabBarIcon: ({ color, size }) => (
              <FontAwesome name="comments" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Timeline"
          component={TimelineScreen}
          options={{
            title: '動態',
            tabBarLabel: '動態',
            headerShown: true,
            ...headerOptions,
            tabBarIcon: ({ color, size }) => (
              <FontAwesome name="newspaper-o" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Friends"
          component={FriendsScreen}
          options={{
            title: '好友',
            tabBarLabel: '好友',
            headerShown: true,
            ...headerOptions,
            tabBarIcon: ({ color, size }) => (
              <FontAwesome name="users" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: '個人資料',
            tabBarLabel: '個人',
            headerShown: true,
            ...headerOptions,
            tabBarIcon: ({ color, size }) => (
              <FontAwesome name="user" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
