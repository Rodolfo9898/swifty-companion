import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../AppRoot';
import { useTheme } from '../ThemeContext';
import createCalculatorProgressStyles from '../styles/calculatorProgressStyles';
import { buildProgressSeries, type XpCheckpoint } from '../utils/xpProgress';

type Props = NativeStackScreenProps<RootStackParamList, 'CalculatorProgress'>;

type ChartPoint = XpCheckpoint & { x: number; y: number };

const CHART_HEIGHT = 220;
const CHART_TOP_PADDING = 10;
const CHART_BOTTOM_PADDING = 22;
const SLICE_WIDTH = 2;

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

export default function CalculatorProgressScreen({ route }: Props) {
  const { baseLevel, projects } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createCalculatorProgressStyles(colors), [colors]);
  const [chartWidth, setChartWidth] = useState(320);

  const checkpoints = useMemo(() => buildProgressSeries(baseLevel, projects), [baseLevel, projects]);

  const levels = checkpoints.map((checkpoint) => checkpoint.level);
  const minLevel = Math.min(...levels);
  const maxLevel = Math.max(...levels);
  const range = Math.max(0.05, maxLevel - minLevel);
  const usableHeight = CHART_HEIGHT - CHART_TOP_PADDING - CHART_BOTTOM_PADDING;
  const baselineY = CHART_HEIGHT - CHART_BOTTOM_PADDING;

  const points: ChartPoint[] = checkpoints.map((checkpoint, index) => {
    const ratio = (checkpoint.level - minLevel) / range;
    const y = baselineY - ratio * usableHeight;
    const x = checkpoints.length > 1 ? (index / (checkpoints.length - 1)) * Math.max(1, chartWidth - 16) + 8 : chartWidth / 2;
    return { ...checkpoint, x, y };
  });

  const slices = useMemo(() => {
    const areaSlices: Array<{ key: string; left: number; top: number; height: number }> = [];
    const lineSlices: Array<{ key: string; left: number; top: number; width: number }> = [];

    if (points.length < 2) {
      return { areaSlices, lineSlices };
    }

    points.slice(0, -1).forEach((start, index) => {
      const end = points[index + 1];
      if (!end) return;

      const deltaX = end.x - start.x;
      if (deltaX <= 0) return;

      const steps = Math.max(1, Math.ceil(deltaX / SLICE_WIDTH));
      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        const x = start.x + deltaX * t;
        const y = start.y + (end.y - start.y) * t;

        areaSlices.push({
          key: `area-${index}-${step}`,
          left: x,
          top: y,
          height: Math.max(2, baselineY - y),
        });

        lineSlices.push({
          key: `line-${index}-${step}`,
          left: x,
          top: y,
          width: SLICE_WIDTH,
        });
      }
    });

    return { areaSlices, lineSlices };
  }, [baselineY, points]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Level Progress</Text>
        <Text style={styles.subtitle}>Project checkpoints</Text>

        <View
          style={styles.chartContainer}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            if (width > 40 && Math.abs(width - chartWidth) > 2) {
              setChartWidth(width - 2);
            }
          }}
        >
          <View style={styles.chartCanvas}>
            {slices.areaSlices.map((slice) => (
              <View
                key={slice.key}
                style={[
                  styles.areaFillSlice,
                  {
                    left: slice.left,
                    top: slice.top,
                    height: slice.height,
                  },
                ]}
              />
            ))}

            {slices.lineSlices.map((slice) => (
              <View
                key={slice.key}
                style={[
                  styles.lineSlice,
                  {
                    left: slice.left,
                    top: slice.top,
                    width: slice.width,
                  },
                ]}
              />
            ))}

            {points.map((point) => (
              <View
                key={`dot-${point.id}`}
                style={[
                  styles.pointDot,
                  {
                    left: point.x - 5,
                    top: point.y - 5,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.axisLabelRow}>
            <Text style={styles.axisLabel}>{`Start ${formatNumber(points[0]?.level ?? 0)}`}</Text>
            <Text style={styles.axisLabel}>{`End ${formatNumber(points[points.length - 1]?.level ?? 0)}`}</Text>
          </View>
        </View>

        {points.map((checkpoint: XpCheckpoint, index) => (
          <View key={`checkpoint-${checkpoint.id}-${index}`} style={styles.checkpointRow}>
            <View style={styles.checkpointHeader}>
              <Text style={styles.checkpointName}>{index === 0 ? 'Start' : `${index}. ${checkpoint.label}`}</Text>
              <Text style={styles.checkpointLevel}>{`Lvl ${formatNumber(checkpoint.level)}`}</Text>
            </View>
            <Text style={styles.checkpointMeta}>{`Gain: +${Math.round(checkpoint.gainXp)} XP`}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
