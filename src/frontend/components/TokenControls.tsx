import React, { useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { getTokenStatus, refreshAccessToken, updateRefreshLeadTime } from '../../backend/api/ftApi';
import { useTheme } from '../ThemeContext';
import createTokenControlStyles from '../styles/tokenControlStyles';

const OPTIONS = [1, 5, 10, 30, 35, 45, 60, 75, 90];

export default function TokenControls() {
  const { colors } = useTheme();
  const styles = useMemo(() => createTokenControlStyles(colors), [colors]);
  const [tokenInfo, setTokenInfo] = useState('Token: not loaded');
  const [tokenRefreshing, setTokenRefreshing] = useState(false);
  const [leadMinutes, setLeadMinutes] = useState(1);

  const updateTokenInfo = () => {
    const status = getTokenStatus();
    if (!status.hasToken || !status.expiresAt) {
      setTokenInfo('Token: not loaded');
      return;
    }
    const remainingMs = Math.max(status.expiresAt - Date.now(), 0);
    const minutes = Math.ceil(remainingMs / 60000);
    setTokenInfo(`Token expires in ${minutes} min`);
  };

  const handleRefreshToken = async () => {
    setTokenRefreshing(true);
    try {
      await refreshAccessToken();
    } finally {
      updateTokenInfo();
      setTokenRefreshing(false);
    }
  };

  useEffect(() => {
    updateTokenInfo();
    const intervalId = setInterval(updateTokenInfo, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    updateRefreshLeadTime(leadMinutes);
  }, [leadMinutes]);

  const openLeadTimePicker = () => {
    if (Platform.OS !== 'ios') return;
    const options = OPTIONS.map((value) => `${value}m`);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...options, 'Cancel'],
        cancelButtonIndex: options.length,
        title: 'Refresh lead time',
      },
      (buttonIndex) => {
        if (buttonIndex == null || buttonIndex >= options.length) return;
        setLeadMinutes(OPTIONS[buttonIndex]);
      },
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{tokenInfo}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Refresh lead time</Text>
          {Platform.OS === 'ios' ? (
            <Pressable style={styles.pickerButton} onPress={openLeadTimePicker}>
              <Text style={styles.pickerButtonText}>{leadMinutes}m</Text>
            </Pressable>
          ) : (
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={String(leadMinutes)}
                onValueChange={(value) => setLeadMinutes(Number(value))}
                mode="dropdown"
                style={styles.picker}
                dropdownIconColor={colors.text}
              >
                {OPTIONS.map((value) => (
                  <Picker.Item key={value} label={`${value}m`} value={String(value)} />
                ))}
              </Picker>
            </View>
          )}
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Manual refresh</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshToken}>
            <Text style={styles.refreshButtonText}>
              {tokenRefreshing ? 'Refreshing...' : 'Refresh now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
