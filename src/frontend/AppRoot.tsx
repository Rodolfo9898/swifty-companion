import React, { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BonusScreen from './screens/BonusScreen';
import BonusSettingsScreen from './screens/BonusSettingsScreen';
import CalculatorScreen from './screens/CalculatorScreen';
import CalculatorProgressScreen from './screens/CalculatorProgressScreen';
import DevCacheScreen from './screens/DevCacheScreen';
import HomeScreen from './screens/HomeScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import LoadingScreen from './screens/LoadingScreen';
import LoginScreen from './screens/LoginScreen';
import PlannerScreen from './screens/PlannerScreen';
import ProfileScreen from './screens/ProfileScreen';
import SearchScreen from './screens/SearchScreen';
import TranscriptWebScreen from './screens/TranscriptWebScreen';
import type { FortyTwoUser } from './types/fortyTwo';
import createAppRootStyles from './styles/appRootStyles';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Search: { initialLogin?: string; autoSearch?: boolean } | undefined;
  Profile: { login: string; initialProfile?: FortyTwoUser };
  Bonus: undefined;
  BonusSettings: undefined;
  Leaderboard: undefined;
  Calculator: undefined;
  CalculatorProgress: {
    baseLevel: number;
    projects: Array<{
      id: string;
      name: string;
      experience: number;
      grade: string;
      bonus: boolean;
    }>;
  };
  TranscriptWeb: {
    userId: number;
    startYear: number;
    endYear: number;
    templateId: number;
  };
  Planner: undefined;
  DevCache: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { colors, name, toggleTheme } = useTheme();
  const styles = useMemo(() => createAppRootStyles(colors), [colors]);
  const toggleLabel = name === 'dark' ? 'Light' : 'Dark';
  const { isAuthenticated, loading, logout } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  const headerActions = () => (
    <View style={styles.headerActions}>
      {isAuthenticated ? (
        <TouchableOpacity style={styles.headerButton} onPress={logout}>
          <Text style={styles.headerButtonText}>Logout</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={styles.headerButton} onPress={toggleTheme}>
        <Text style={styles.headerButtonText}>{toggleLabel}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <NavigationContainer>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: '#000000',
          headerTitleStyle: { fontWeight: '600' },
          headerTitleAlign: 'left',
          headerTitleContainerStyle: { flex: 1 },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{
                headerTitle: () => (
                  <View style={styles.headerTitle}>
                    <View style={styles.headerTitleRow}>
                      <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                      <Text style={styles.headerText}>42 Tools</Text>
                    </View>
                  </View>
                ),
                headerRight: headerActions,
              }}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{
                headerTitle: () => (
                  <View style={styles.headerTitle}>
                    <View style={styles.headerTitleRow}>
                      <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                      <Text style={styles.headerText}>Search</Text>
                    </View>
                  </View>
                ),
                headerRight: headerActions,
              }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                headerTitle: () => (
                  <View style={styles.headerTitle}>
                    <View style={styles.headerTitleRow}>
                      <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                      <Text style={styles.headerText}>Student Profile</Text>
                    </View>
                  </View>
                ),
                headerRight: headerActions,
              }}
            />
            <Stack.Screen
              name="Leaderboard"
              component={LeaderboardScreen}
              options={{
                headerTitle: () => (
                  <View style={styles.headerTitle}>
                    <View style={styles.headerTitleRow}>
                      <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                      <Text style={styles.headerText}>Leaderboard</Text>
                    </View>
                  </View>
                ),
                headerRight: headerActions,
              }}
            />
            <Stack.Screen
              name="Calculator"
              component={CalculatorScreen}
              options={{
                headerTitle: () => (
                  <View style={styles.headerTitle}>
                    <View style={styles.headerTitleRow}>
                      <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                      <Text style={styles.headerText}>XP Calculator</Text>
                    </View>
                  </View>
                ),
                headerRight: headerActions,
              }}
            />
            <Stack.Screen
              name="CalculatorProgress"
              component={CalculatorProgressScreen}
              options={{
                headerTitle: () => (
                  <View style={styles.headerTitle}>
                    <View style={styles.headerTitleRow}>
                      <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                      <Text style={styles.headerText}>Progress Graph</Text>
                    </View>
                  </View>
                ),
                headerRight: headerActions,
              }}
            />
            <Stack.Screen
              name="Planner"
              component={PlannerScreen}
              options={{
                headerTitle: () => (
                  <View style={styles.headerTitle}>
                    <View style={styles.headerTitleRow}>
                      <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                      <Text style={styles.headerText}>RNCP Planner</Text>
                    </View>
                  </View>
                ),
                headerRight: headerActions,
              }}
            />
            <Stack.Screen
              name="Bonus"
              component={BonusScreen}
              options={{
                headerTitle: () => (
                  <View style={styles.headerTitle}>
                    <View style={styles.headerTitleRow}>
                      <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                      <Text style={styles.headerText}>Quick Access</Text>
                    </View>
                  </View>
                ),
                headerRight: headerActions,
              }}
            />
            <Stack.Screen
              name="BonusSettings"
              component={BonusSettingsScreen}
              options={{
                headerTitle: () => (
                  <View style={styles.headerTitle}>
                    <View style={styles.headerTitleRow}>
                      <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                      <Text style={styles.headerText}>Local Settings</Text>
                    </View>
                  </View>
                ),
                headerRight: headerActions,
              }}
            />
            <Stack.Screen
              name="TranscriptWeb"
              component={TranscriptWebScreen}
              options={{
                headerTitle: () => (
                  <View style={styles.headerTitle}>
                    <View style={styles.headerTitleRow}>
                      <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                      <Text style={styles.headerText}>Transcript Web</Text>
                    </View>
                  </View>
                ),
                headerRight: headerActions,
              }}
            />
            <Stack.Screen
              name="DevCache"
              component={DevCacheScreen}
              options={{
                headerTitle: () => (
                  <View style={styles.headerTitle}>
                    <View style={styles.headerTitleRow}>
                      <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                      <Text style={styles.headerText}>Dev Cache</Text>
                    </View>
                  </View>
                ),
                headerRight: headerActions,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppRoot() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
