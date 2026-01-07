import React from 'react';
import { Text, View } from 'react-native';

import type { ThemeColors } from '../styles/theme';

interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
  colors: ThemeColors;
}

export default function StatCard({ title, value, hint, colors }: StatCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        flex: 1,
        minWidth: 140,
      }}
    >
      <Text style={{ color: colors.textSubtle, fontSize: 12, marginBottom: 6 }}>{title}</Text>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{value}</Text>
      {hint ? (
        <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 11 }}>{hint}</Text>
      ) : null}
    </View>
  );
}
