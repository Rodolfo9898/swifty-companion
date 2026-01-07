import React, { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SearchScreen from './screens/SearchScreen';
import ProfileScreen from './screens/ProfileScreen';
import BonusScreen from './screens/BonusScreen';
import type { FortyTwoUser } from './types/fortyTwo';
import createAppRootStyles from './styles/appRootStyles';
import { ThemeProvider, useTheme } from './ThemeContext';

export type RootStackParamList = {
  Search: undefined;
  Profile: { login: string; initialProfile?: FortyTwoUser };
  Bonus: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { colors, name, toggleTheme } = useTheme();
  const styles = useMemo(() => createAppRootStyles(colors), [colors]);
  const toggleLabel = name === 'dark' ? 'Light' : 'Dark';

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
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={({ navigation }) => ({
            headerTitle: () => (
              <View style={styles.headerTitle}>
                <View style={styles.headerTitleRow}>
                  <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                  <Text style={styles.headerText}>Swifty Companion</Text>
                </View>
              </View>
            ),
            headerRight: () => (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => navigation.navigate('Bonus')}
                >
                  <Text style={styles.headerButtonText}>Bonus</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={toggleTheme}>
                  <Text style={styles.headerButtonText}>{toggleLabel}</Text>
                </TouchableOpacity>
              </View>
            ),
          })}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={({ navigation }) => ({
            headerTitle: () => (
              <View style={styles.headerTitle}>
                <View style={styles.headerTitleRow}>
                  <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                  <Text style={styles.headerText}>Student Profile</Text>
                </View>
              </View>
            ),
            headerRight: () => (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => navigation.navigate('Bonus')}
                >
                  <Text style={styles.headerButtonText}>Bonus</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={toggleTheme}>
                  <Text style={styles.headerButtonText}>{toggleLabel}</Text>
                </TouchableOpacity>
              </View>
            ),
          })}
        />
        <Stack.Screen
          name="Bonus"
          component={BonusScreen}
          options={{
            headerTitle: () => (
              <View style={styles.headerTitle}>
                <View style={styles.headerTitleRow}>
                  <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
                  <Text style={styles.headerText}>Bonus</Text>
                </View>
              </View>
            ),
            headerRight: () => (
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerButton} onPress={toggleTheme}>
                  <Text style={styles.headerButtonText}>{toggleLabel}</Text>
                </TouchableOpacity>
              </View>
            ),
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppRoot() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
