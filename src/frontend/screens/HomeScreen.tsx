import React, { useMemo } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../AppRoot';
import { useAuth } from '../AuthContext';
import createHomeStyles from '../styles/homeStyles';
import { useTheme } from '../ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const TILES: Array<{
  title: string;
  subtitle: string;
  route: keyof RootStackParamList;
}> = [
  { title: 'Search', subtitle: 'Find any 42 student.', route: 'Search' },
  { title: 'Leaderboard', subtitle: 'Compare yourself with the rest of 42.', route: 'Leaderboard' },
  { title: 'Stats', subtitle: 'All campus metrics.', route: 'Stats' },
  { title: 'XP Calculator', subtitle: 'Plan your journey.', route: 'Calculator' },
  { title: 'RNCP', subtitle: 'Track RNCP progress.', route: 'Rncp' },
  { title: 'Bonus', subtitle: 'Token refresh tools.', route: 'Bonus' },
];

export default function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createHomeStyles(colors), [colors]);
  const { user } = useAuth();
  const avatar = user?.image?.link;

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

      <View style={styles.grid}>
        {TILES.map((tile) => (
          <TouchableOpacity
            key={tile.route}
            style={styles.tile}
            onPress={() => navigation.navigate(tile.route)}
          >
            <Text style={styles.tileTitle}>{tile.title}</Text>
            <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
