import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../AuthContext';
import createLoginStyles from '../styles/loginStyles';
import { useTheme } from '../ThemeContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createLoginStyles(colors), [colors]);
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Swifty Companion</Text>
        <Text style={styles.subtitle}>
          Sign in with your 42 intra account to access the stats, calculator, RNCP tracker, and
          student listings.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.buttonText}>Login with 42</Text>
          )}
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}
