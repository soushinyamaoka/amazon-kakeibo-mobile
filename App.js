import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { DataProvider } from './src/context/DataContext';
import DashboardScreen from './src/screens/DashboardScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import AmazonSyncScreen from './src/screens/AmazonSyncScreen';
import BankSyncScreen from './src/screens/BankSyncScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: '📊', History: '📝', Budget: '🎯',
  AmazonSync: '📦', BankSync: '🏦',
};

export default function App() {
  return (
    <DataProvider>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#81B29A',
            background: '#0d1117',
            card: '#161b22',
            text: '#e0e0e0',
            border: 'rgba(255,255,255,0.08)',
            notification: '#E07A5F',
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '800' },
          },
        }}
      >
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerStyle: { backgroundColor: '#161b22', elevation: 0, shadowOpacity: 0 },
            headerTintColor: '#e0e0e0',
            headerTitleStyle: { fontWeight: '800' },
            tabBarStyle: {
              backgroundColor: '#161b22',
              borderTopColor: 'rgba(255,255,255,0.06)',
              paddingBottom: 6,
              paddingTop: 6,
              height: 60,
            },
            tabBarActiveTintColor: '#81B29A',
            tabBarInactiveTintColor: '#8D99AE',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>
            ),
          })}
        >
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ title: 'ダッシュボード', headerTitle: '📊 Kakeibo' }}
          />
          <Tab.Screen
            name="History"
            component={HistoryScreen}
            options={{ title: '明細' }}
          />
          <Tab.Screen
            name="Budget"
            component={BudgetScreen}
            options={{ title: '予算' }}
          />
          <Tab.Screen
            name="AmazonSync"
            component={AmazonSyncScreen}
            options={{ title: 'Amazon' }}
          />
          <Tab.Screen
            name="BankSync"
            component={BankSyncScreen}
            options={{ title: '銀行' }}
          />
        </Tab.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </DataProvider>
  );
}