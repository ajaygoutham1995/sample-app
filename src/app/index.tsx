import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ActionTile,
  Card,
  Palette,
  Row,
  SectionTitle,
} from '@/components/ui/dashboard';
import { ACTIVITY_TINTS } from '@/features/activityControls';
import { startCountdown } from '@/features/countdown/countdownFeature';
import { startDownload } from '@/features/download/downloadFeature';
import { startMusic } from '@/features/music/musicFeature';
import { startStopwatch } from '@/features/stopwatch/stopwatchFeature';
import { startTimer } from '@/features/timer/timerFeature';
import {
  useLiveActivityAuthorization,
  useNotificationPermission,
} from '@/hooks/useSystemStatus';
import { describePermission } from '@/services/NotificationService';
import { describeAuthorization } from '@/services/LiveActivityService';
import { useDeviceGeometry } from '@/services/DeviceGeometryService';
import { dynamicNotchManager } from '@/services/DynamicNotchManager';
import { powerService } from '@/services/PowerService';
import { useActivities } from '@/state/activityStore';
import { useNotchVisualState, usePresentedActivityId } from '@/state/dynamicNotchStore';
import { useSetting } from '@/state/settingsStore';

export default function DashboardScreen() {
  const geometry = useDeviceGeometry();
  const insets = useSafeAreaInsets();
  const activities = useActivities();
  const visualState = useNotchVisualState();
  const presentedId = usePresentedActivityId();
  const previewMode = useSetting('previewMode');
  const { snapshot, request, openSettings } = useNotificationPermission();
  const liveActivityState = useLiveActivityAuthorization();

  const presented = activities.find((activity) => activity.id === presentedId) ?? null;
  const running = activities.filter((activity) => activity.status === 'active');

  // The surface sits over the top of the screen, so content starts below the
  // tallest thing it can become in its resting state.
  const topPadding = Math.max(insets.top, geometry.compact.height) + 20;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding, paddingBottom: insets.bottom + 40 },
      ]}
      contentInsetAdjustmentBehavior="never"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dynamic Notch</Text>
        <Text style={styles.subtitle}>
          {presented
            ? presented.title + ' is on the surface'
            : running.length > 0
              ? running.length + ' running'
              : 'No activity running'}
        </Text>
      </View>

      {geometry.presentationType !== 'NOTCH' && !previewMode ? (
        <Card style={styles.notice}>
          <Text style={styles.noticeTitle}>
            {geometry.presentationType === 'DYNAMIC_ISLAND'
              ? 'This device has a Dynamic Island'
              : 'This device has no notch'}
          </Text>
          <Text style={styles.noticeBody}>
            {geometry.presentationType === 'DYNAMIC_ISLAND'
              ? 'Apple owns that cutout. Drawing a second island over it would be a competing, non-native UI, so activities here are presented through ActivityKit instead. Turn on Preview mode in Settings to inspect the notch surface anyway.'
              : 'The custom surface is only drawn on iPhones with a physical notch. Turn on Preview mode in Settings to simulate one.'}
          </Text>
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionTitle>Active activity</SectionTitle>
        <Card>
          {presented ? (
            <>
              <Row
                title={presented.title}
                detail={presented.subtitle ?? presented.type}
                status={presented.status}
                statusTone={presented.status === 'active' ? 'positive' : 'warning'}
              />
              <Row
                title="Surface"
                detail="Tap the notch, or pull down on it, to expand"
                status={visualState}
                last
                onPress={() => dynamicNotchManager.toggle()}
                accessibilityHint="Expands or collapses the Dynamic Notch"
              />
            </>
          ) : (
            <Row
              title="Nothing on the surface"
              detail="Start an activity below and it appears at the notch"
              last
            />
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Start an activity</SectionTitle>
        <View style={styles.tiles}>
          <ActionTile
            label="Timer"
            caption="5 minutes"
            symbol="timer"
            tint={ACTIVITY_TINTS.timer}
            onPress={() => startTimer(5 * 60_000)}
          />
          <ActionTile
            label="Stopwatch"
            caption="Counts up"
            symbol="stopwatch"
            tint={ACTIVITY_TINTS.stopwatch}
            onPress={() => startStopwatch()}
          />
          <ActionTile
            label="Music"
            caption="Three track queue"
            symbol="music.note"
            tint={ACTIVITY_TINTS.music}
            onPress={() => startMusic()}
          />
          <ActionTile
            label="Download"
            caption="842 MB"
            symbol="arrow.down.circle.fill"
            tint={ACTIVITY_TINTS.download}
            onPress={() => startDownload()}
          />
          <ActionTile
            label="Countdown"
            caption="Ends in 2 minutes"
            symbol="calendar"
            tint={ACTIVITY_TINTS.countdown}
            onPress={() => startCountdown('Launch', Date.now() + 120_000)}
          />
          <ActionTile
            label="Charging"
            caption="Simulate a charger"
            symbol="bolt.fill"
            tint={ACTIVITY_TINTS.charging}
            onPress={() => powerService.simulateChargerConnected()}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle>System</SectionTitle>
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
              snapshot?.canAsk
                ? 'Asks iOS for notification permission'
                : snapshot?.needsSettings
                  ? 'Opens this app in iOS Settings'
                  : undefined
            }
          />
          <Row
            title="Live Activities"
            detail={describeAuthorization(liveActivityState)}
            status={liveActivityState === 'ENABLED' ? 'enabled' : 'unavailable'}
            statusTone={liveActivityState === 'ENABLED' ? 'positive' : 'warning'}
          />
          <Row
            title="Charging"
            detail={
              Platform.OS === 'web'
                ? 'Battery events are not available on web'
                : 'Connect a charger to see the surface react'
            }
            status={powerService.isCharging() ? 'connected' : 'not charging'}
            statusTone={powerService.isCharging() ? 'positive' : 'neutral'}
            last
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Device</SectionTitle>
        <Card>
          <Row
            title={geometry.deviceName}
            detail={geometry.isSimulated ? 'Simulated by the geometry inspector' : undefined}
            status={geometry.presentationType}
            statusTone={geometry.presentationType === 'NOTCH' ? 'positive' : 'neutral'}
          />
          <Row
            title="Screen"
            detail={'Top safe area ' + geometry.topSafeArea.toFixed(0) + ' pt'}
            status={
              Math.round(geometry.screenWidth) + ' x ' + Math.round(geometry.screenHeight) + ' pt'
            }
          />
          <Row
            title="Physical notch"
            detail={
              geometry.notch
                ? geometry.notch.widthMm +
                  ' x ' +
                  geometry.notch.heightMm +
                  ' mm at ' +
                  geometry.pointsPerMm.toFixed(2) +
                  ' pt/mm'
                : 'This device has no notch'
            }
            status={
              geometry.notch
                ? geometry.notch.width.toFixed(0) + ' x ' + geometry.notch.height.toFixed(0) + ' pt'
                : '-'
            }
          />
          <Row
            title="Settings"
            detail="Permissions, motion, preview and the geometry inspector"
            status="Open"
            last
            onPress={() => router.push('/settings')}
            accessibilityHint="Opens the settings screen"
          />
        </Card>
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
    gap: 4,
  },
  title: {
    color: Palette.text,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Palette.textSecondary,
    fontSize: 15,
  },
  section: {
    gap: 0,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  notice: {
    padding: 16,
    gap: 6,
  },
  noticeTitle: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  noticeBody: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
