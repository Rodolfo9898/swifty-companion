import React, { useMemo } from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../AppRoot';
import { useAuth } from '../AuthContext';
import { useLocalDb } from '../LocalDbContext';
import createHomeStyles from '../styles/homeStyles';
import { useTheme } from '../ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const TILES: Array<{
  title: string;
  subtitle: string;
  route: keyof RootStackParamList;
  adminOnly?: boolean;
}> = [
  { title: 'Search', subtitle: 'Find any 42 student.', route: 'Search' },
  { title: 'Leaderboard', subtitle: 'Compare yourself with the rest of 42.', route: 'Leaderboard' },
  { title: 'XP Calculator', subtitle: 'Plan your journey.', route: 'Calculator' },
  { title: 'RNCP Planner', subtitle: 'Plan your RNCP path.', route: 'Planner' },
  { title: 'Quick Access', subtitle: 'Intranet shortcuts and essentials.', route: 'Bonus', adminOnly: true },
];

export default function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createHomeStyles(colors), [colors]);
  const { user } = useAuth();
  const { isRefreshingDb } = useLocalDb();
  const avatar = user?.image?.link;
  const canOpenProfile = Boolean(user?.login);
  const isAdmin = user?.login === 'rperez-t';
  const visibleTiles = useMemo(() => TILES.filter((tile) => !tile.adminOnly || isAdmin), [isAdmin]);
  const blockedDuringRefresh = new Set<keyof RootStackParamList>(['Search', 'Planner']);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <Image source={require('../../../assets/logo.png')} style={styles.avatar} />
        )}
        <View style={styles.headerText}>
          <Text style={styles.welcome}>
            {user ? `Welcome back, ${user.displayname}` : 'Welcome back'}
          </Text>
          <Text style={styles.subtitle}>Choose a section to explore.</Text>
        </View>
      </View>
      {isRefreshingDb ? (
        <Text style={styles.subtitle}>Local leaderboard DB is updating. Some sections are temporarily locked.</Text>
      ) : null}

      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.tile, (!canOpenProfile || isRefreshingDb) && { opacity: 0.6 }]}
          onPress={() => {
            if (isRefreshingDb) {
              Alert.alert('Database update', 'Please wait until local DB refresh is completed.');
              return;
            }
            if (!user?.login) return;
            navigation.navigate('Profile', { login: user.login, initialProfile: user });
          }}
          disabled={!canOpenProfile || isRefreshingDb}
        >
          <Text style={styles.tileTitle}>My Profile</Text>
          <Text style={styles.tileSubtitle}>
            {isRefreshingDb ? 'Temporarily locked while local DB updates.' : 'Open your current 42 profile.'}
          </Text>
        </TouchableOpacity>
        {visibleTiles.map((tile) => (
          <TouchableOpacity
            key={tile.route}
            style={[styles.tile, isRefreshingDb && blockedDuringRefresh.has(tile.route) && { opacity: 0.6 }]}
            onPress={() => {
              if (isRefreshingDb && blockedDuringRefresh.has(tile.route)) {
                Alert.alert('Database update', 'Please wait until local DB refresh is completed.');
                return;
              }
              navigation.navigate(tile.route);
            }}
          >
            <Text style={styles.tileTitle}>{tile.title}</Text>
            <Text style={styles.tileSubtitle}>
              {isRefreshingDb && blockedDuringRefresh.has(tile.route)
                ? 'Temporarily locked while local DB updates.'
                : tile.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
