import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Platform, StyleSheet, Text } from 'react-native';

/** Unicode stand-ins for platforms with no SF Symbols. */
const FALLBACK_GLYPHS: Record<string, string> = {
  'timer': '⏱',
  'stopwatch': '⏱',
  'music.note': '♪',
  'arrow.down.circle.fill': '⬇',
  'calendar': '●',
  'bolt.fill': '⚡',
  'play.fill': '▶',
  'pause.fill': '⏸',
  'stop.fill': '■',
  'forward.fill': '⏭',
  'backward.fill': '⏮',
  'arrow.counterclockwise': '↺',
  'xmark': '✕',
};

export interface ActivityGlyphProps {
  symbol: string;
  size: number;
  color: string;
}

/**
 * One glyph, drawn as a real SF Symbol on iOS - which is the only platform
 * the notch presentation actually ships on - and as a Unicode stand-in
 * elsewhere so preview mode still renders something meaningful.
 */
export function ActivityGlyph({ symbol, size, color }: ActivityGlyphProps) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={symbol as SFSymbol}
        size={size}
        tintColor={color}
        weight="semibold"
        resizeMode="scaleAspectFit"
        fallback={<GlyphFallback symbol={symbol} size={size} color={color} />}
      />
    );
  }
  return <GlyphFallback symbol={symbol} size={size} color={color} />;
}

function GlyphFallback({ symbol, size, color }: ActivityGlyphProps) {
  return (
    <Text
      style={[styles.fallback, { fontSize: size * 0.86, color, lineHeight: size * 1.1 }]}
      allowFontScaling={false}
    >
      {FALLBACK_GLYPHS[symbol] ?? '●'}
    </Text>
  );
}

const styles = StyleSheet.create({
  fallback: {
    textAlign: 'center',
  },
});
