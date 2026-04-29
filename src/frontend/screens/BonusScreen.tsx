import React, { useMemo, useRef } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import createBonusStyles from '../styles/bonusStyles';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';

export default function BonusScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createBonusStyles(colors), [colors]);
  const navigation = useNavigation();
  const { user } = useAuth();

  const tapCount = useRef(0);
  const lastTap = useRef(0);

  const handleSecretTap = () => {
    const now = Date.now();
    if (now - lastTap.current > 2000) {
      tapCount.current = 0;
    }
    lastTap.current = now;
    tapCount.current += 1;
    if (tapCount.current >= 7) {
      tapCount.current = 0;
      // Hidden dev screen
      // @ts-expect-error - navigation typing for hidden route
      navigation.navigate('DevCache');
    }
  };

  const handleOpenIntranet = () => {
    if (!user?.login) {
      Alert.alert('Login required', 'Please login to open your intranet profile.');
      return;
    }
    const profileUrl = `https://profile.intra.42.fr/users/${user.login}`;
    if (Platform.OS === 'web') {
      void Linking.openURL(profileUrl);
      return;
    }
    // @ts-expect-error route typed in RootStackParamList
    navigation.navigate('IntranetWeb', {
      url: profileUrl,
      title: 'Intranet Profile',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={handleSecretTap} activeOpacity={0.8}>
        <Text style={styles.title}>Intranet</Text>
      </TouchableOpacity>
      <Text style={styles.subtitle}>Quick access to your 42 profile essentials.</Text>

      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroTitle}>{user?.displayname || '42 Student'}</Text>
            <Text style={styles.heroSubtitle}>{user?.login || 'Login required'}</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>Intranet</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Important links</Text>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => {
            // @ts-expect-error route typed in RootStackParamList
            navigation.navigate('BonusSettings');
          }}
        >
          <Text style={styles.linkTitle}>Local sync settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={handleOpenIntranet}>
          <Text style={styles.linkTitle}>Open intranet profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
