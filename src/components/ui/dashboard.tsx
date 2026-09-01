import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { ActivityGlyph } from '@/components/dynamic-notch/ActivityGlyph';

export const Palette = {
  background: '#000000',
  surface: '#131315',
  surfaceRaised: '#1C1C1F',
  hairline: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textSecondary: 'rgba(235,235,245,0.6)',
  textTertiary: 'rgba(235,235,245,0.35)',
  positive: '#30D158',
  warning: '#FF9F0A',
  negative: '#FF453A',
} as const;

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children.toUpperCase()}</Text>;
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({
  title,
  detail,
  status,
  statusTone = 'neutral',
  onPress,
  accessibilityHint,
  last,
}: {
  title: string;
  detail?: string;
  status?: string;
  statusTone?: 'neutral' | 'positive' | 'warning' | 'negative';
  onPress?: () => void;
  accessibilityHint?: string;
  last?: boolean;
}) {
  const toneColor =
    statusTone === 'positive'
      ? Palette.positive
      : statusTone === 'warning'
        ? Palette.warning
        : statusTone === 'negative'
          ? Palette.negative
          : Palette.textSecondary;

  const body = (
    <View style={[styles.row, last ? null : styles.rowDivider]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {status ? (
        <Text style={[styles.rowStatus, { color: toneColor }]} numberOfLines={1}>
          {status}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {body}
    </Pressable>
  );
}

export function ActionTile({
  label,
  caption,
  symbol,
  tint,
  onPress,
}: {
  label: string;
  caption: string;
  symbol: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={caption}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={[styles.tileGlyph, { backgroundColor: tint + '22' }]}>
        <ActivityGlyph symbol={symbol} size={20} color={tint} />
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileCaption} numberOfLines={1}>
        {caption}
      </Text>
    </Pressable>
  );
}

export function Toggle({
  label,
  detail,
  value,
  onChange,
  last,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View style={[styles.row, last ? null : styles.rowDivider]}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{label}</Text>
          {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
        </View>
        <View style={[styles.switchTrack, value ? styles.switchTrackOn : null]}>
          <View style={[styles.switchKnob, value ? styles.switchKnobOn : null]} />
        </View>
      </View>
    </Pressable>
  );
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected ? styles.segmentSelected : null]}
          >
            <Text style={[styles.segmentLabel, selected ? styles.segmentLabelSelected : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: Palette.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.hairline,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    minHeight: 48,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.hairline,
  },
  rowText: {
    flexShrink: 1,
    gap: 2,
  },
  rowTitle: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: '500',
  },
  rowDetail: {
    color: Palette.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  rowStatus: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 0,
    maxWidth: 140,
    textAlign: 'right',
  },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.hairline,
    padding: 14,
    gap: 6,
  },
  tileGlyph: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileLabel: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  tileCaption: {
    color: Palette.textTertiary,
    fontSize: 12,
  },
  switchTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(120,120,128,0.32)',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: Palette.positive,
  },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  switchKnobOn: {
    alignSelf: 'flex-end',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(120,120,128,0.18)',
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: Palette.surfaceRaised,
  },
  segmentLabel: {
    color: Palette.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentLabelSelected: {
    color: Palette.text,
    fontWeight: '600',
  },
});
