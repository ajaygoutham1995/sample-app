import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Card,
  Palette,
  Row,
  SectionTitle,
  SegmentedControl,
  Toggle,
} from '@/components/ui/dashboard';
import {
  useLiveActivityAuthorization,
  useNotificationPermission,
} from '@/hooks/useSystemStatus';
import { DEVICE_PROFILES } from '@/geometry/devicePhysicalProfiles';
import { useDeviceGeometry } from '@/services/DeviceGeometryService';
import { describeAuthorization } from '@/services/LiveActivityService';
import { describePermission } from '@/services/NotificationService';
import { setSetting, useSettings } from '@/state/settingsStore';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const geometry = useDeviceGeometry();
  const { snapshot, request, openSettings } = useNotificationPermission();
  const liveActivityState = useLiveActivityAuthorization();

  const notchProfiles = DEVICE_PROFILES.filter((profile) => profile.presentation === 'NOTCH');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close settings"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={styles.done}>Done</Text>
        </Pressable>
      </View>

      <View>
        <SectionTitle>Permissions</SectionTitle>
        <Card>
          <Row
            title="Notifications"
            detail={snapshot ? describePermission(snapshot) : 'Checking...'}
            status={snapshot?.state ?? '...'}
            statusTone={
              snapshot?.state === 'authorized'
                ? 'positive'
                : snapshot?.state === 'denied'
                  ? 'negative'
                  : 'warning'
            }
            onPress={
              snapshot?.canAsk
                ? () => void request()
                : snapshot?.needsSettings
                  ? () => void openSettings()
                  : undefined
            }
            accessibilityHint={
              snapshot?.canAsk ? 'Asks iOS for permission' : 'Opens iOS Settings'
            }
          />
          <Row
            title="Live Activities"
            detail={describeAuthorization(liveActivityState)}
            status={liveActivityState === 'ENABLED' ? 'enabled' : 'unavailable'}
            statusTone={liveActivityState === 'ENABLED' ? 'positive' : 'warning'}
            last
          />
        </Card>
      </View>

      <View>
        <SectionTitle>Feel</SectionTitle>
        <Card>
          <Toggle
            label="Haptics"
            detail="Subtle feedback on expansion, charging and completion"
            value={settings.hapticsEnabled}
            onChange={(next) => setSetting('hapticsEnabled', next)}
          />
          <Toggle
            label="Auto collapse"
            detail="Return the surface to compact after a few seconds"
            value={settings.autoCollapse}
            onChange={(next) => setSetting('autoCollapse', next)}
          />
          <Toggle
            label="Respect Reduce Motion"
            detail="Remove spring overshoot when iOS asks for less motion"
            value={settings.respectReduceMotion}
            onChange={(next) => setSetting('respectReduceMotion', next)}
            last
          />
        </Card>

        <View style={styles.sliderGroup}>
          <Text style={styles.sliderLabel}>Animation speed</Text>
          <SegmentedControl
            label="Animation speed"
            value={settings.animationSpeed}
            onChange={(next) => setSetting('animationSpeed', next)}
            options={[
              { label: 'Slow', value: 0.7 },
              { label: 'Default', value: 1 },
              { label: 'Snappy', value: 1.4 },
            ]}
          />

          <Text style={styles.sliderLabel}>Animation intensity</Text>
          <SegmentedControl
            label="Animation intensity"
            value={settings.animationIntensity}
            onChange={(next) => setSetting('animationIntensity', next)}
            options={[
              { label: 'None', value: 0 },
              { label: 'Subtle', value: 0.5 },
              { label: 'Full', value: 1 },
            ]}
          />
        </View>
      </View>

      <View>
        <SectionTitle>Development</SectionTitle>
        <Card>
          <Toggle
            label="Preview mode"
            detail="Draw the surface on devices with no physical notch"
            value={settings.previewMode}
            onChange={(next) => setSetting('previewMode', next)}
          />
          <Toggle
            label="Geometry inspector"
            detail="Overlay the notch reference, centre line and surface bounds"
            value={settings.showGeometryInspector}
            onChange={(next) => setSetting('showGeometryInspector', next)}
            last
          />
        </Card>

        <View style={styles.sliderGroup}>
          <Text style={styles.sliderLabel}>Simulate device geometry</Text>
          <Card>
            <Row
              title="This device"
              detail={geometry.isSimulated ? undefined : 'Currently in use'}
              status={settings.simulatedModelId == null ? 'selected' : undefined}
              statusTone="positive"
              onPress={() => setSetting('simulatedModelId', null)}
            />
            {notchProfiles.map((profile, index) => {
              const id = profile.modelIds[0];
              return (
                <Row
                  key={id}
                  title={profile.marketingName}
                  detail={
                    profile.pointWidth +
                    ' x ' +
                    profile.pointHeight +
                    ' pt  @' +
                    profile.scale +
                    'x  ' +
                    profile.ppi +
                    ' ppi  ' +
                    (profile.notch ? profile.notch.widthMm + ' mm notch' : '')
                  }
                  status={settings.simulatedModelId === id ? 'selected' : undefined}
                  statusTone="positive"
                  onPress={() => setSetting('simulatedModelId', id)}
                  last={index === notchProfiles.length - 1}
                />
              );
            })}
          </Card>
          <Text style={styles.footnote}>
            Simulating a device recomputes the whole geometry chain from that
            panel&apos;s density and notch reference. It does not resize the screen, so
            the surface is drawn at the simulated device&apos;s true point size on this
            one - which is exactly what makes a misalignment visible.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    paddingHorizontal: 16,
    gap: 26,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: Palette.text,
    fontSize: 28,
    fontWeight: '700',
  },
  done: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '600',
  },
  sliderGroup: {
    gap: 10,
    marginTop: 16,
  },
  sliderLabel: {
    color: Palette.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  footnote: {
    color: Palette.textTertiary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    marginHorizontal: 4,
  },
});
