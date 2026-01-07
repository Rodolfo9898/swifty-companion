import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../AppRoot';
import { fetchUserProfile } from '../../backend/api/ftApi';
import createSearchStyles from '../styles/searchStyles';
import { useTheme } from '../ThemeContext';


type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

export default function SearchScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createSearchStyles(colors), [colors]);
  const [login, setLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleSearch = async () => {
    const value = login.trim();
    if (!value) {
      setError('Please enter a login.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const profile = await fetchUserProfile(value);
      navigation.navigate('Profile', { login: value, initialProfile: profile });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.banner}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} />
          <View>
            <Text style={styles.title}>Find 42 student</Text>
            <Text style={styles.subtitle}>
              Enter the login you wish to fetch.
            </Text>
          </View>
        </View>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="e.g. rperez-t"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={login}
          onChangeText={setLogin}
          editable={!loading}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleSearch} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.buttonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
