import ActivityKit
import SwiftUI
import WidgetKit

// NOTE ON SHARED TYPES
// -------------------
// `DynamicNotchAttributes` is declared once, in
// `modules/dynamic-notch-activity/ios/DynamicNotchAttributes.swift`, and must
// be a member of BOTH the app target and this widget extension target.
// ActivityKit matches a running activity to its widget by that type; two
// separate declarations that merely look alike will not match, and the symptom
// is an activity that starts successfully and then renders nothing.
// See README-LIVE-ACTIVITIES.md for the one-time target membership step.

@available(iOS 16.2, *)
struct DynamicNotchLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: DynamicNotchAttributes.self) { context in
      LockScreenView(context: context)
        .activityBackgroundTint(Color.black.opacity(0.72))
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      // This is Apple's Dynamic Island, on hardware that has one. The app's own
      // notch surface is never drawn on these devices - the system presentation
      // is the correct one, and a second island drawn over it would be wrong.
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: context.attributes.symbol)
            .font(.title2)
            .foregroundStyle(tint(context))
            .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          ClockOrProgress(context: context)
            .font(.system(.title2, design: .rounded).monospacedDigit())
            .foregroundStyle(.white)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.center) {
          VStack(spacing: 2) {
            Text(context.state.title)
              .font(.headline)
              .lineLimit(1)
            if let subtitle = context.state.subtitle {
              Text(subtitle)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          if let progress = context.state.progress {
            ProgressView(value: progress)
              .tint(tint(context))
          }
        }
      } compactLeading: {
        Image(systemName: context.attributes.symbol)
          .foregroundStyle(tint(context))
      } compactTrailing: {
        ClockOrProgress(context: context)
          .font(.caption2.monospacedDigit())
          .frame(maxWidth: 52)
      } minimal: {
        Image(systemName: context.attributes.symbol)
          .foregroundStyle(tint(context))
      }
      .keylineTint(tint(context))
    }
  }

  private func tint(_ context: ActivityViewContext<DynamicNotchAttributes>) -> Color {
    Color(hex: context.attributes.tintHex)
  }
}

/// Lock Screen and notch-device presentation.
@available(iOS 16.2, *)
struct LockScreenView: View {
  let context: ActivityViewContext<DynamicNotchAttributes>

  var body: some View {
    HStack(spacing: 14) {
      Image(systemName: context.attributes.symbol)
        .font(.system(size: 26))
        .foregroundStyle(Color(hex: context.attributes.tintHex))
        .frame(width: 34)

      VStack(alignment: .leading, spacing: 4) {
        Text(context.state.title)
          .font(.headline)
          .lineLimit(1)
        if let subtitle = context.state.subtitle {
          Text(subtitle)
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
        if let progress = context.state.progress {
          ProgressView(value: progress)
            .tint(Color(hex: context.attributes.tintHex))
        }
      }

      Spacer(minLength: 0)

      ClockOrProgress(context: context)
        .font(.system(.title2, design: .rounded).monospacedDigit())
        .foregroundStyle(.white)
    }
    .padding(16)
  }
}

/// A self-updating readout.
///
/// `Text(timerInterval:)` is drawn and advanced by the system, so a running
/// timer on the Lock Screen costs no updates at all. Pushing a new string every
/// second would burn the activity's update budget and still look worse.
@available(iOS 16.2, *)
struct ClockOrProgress: View {
  let context: ActivityViewContext<DynamicNotchAttributes>

  var body: some View {
    if context.state.isPaused {
      pausedText
    } else if let start = context.state.startedAt, let end = context.state.endsAt {
      Text(timerInterval: start...end, countsDown: !context.state.countsUp)
        .multilineTextAlignment(.trailing)
    } else if let start = context.state.startedAt, context.state.countsUp {
      Text(start, style: .timer)
    } else if let progress = context.state.progress {
      Text("\(Int(progress * 100))%")
    } else {
      EmptyView()
    }
  }

  /// A paused activity must show a frozen value, not a clock that keeps moving.
  private var pausedText: some View {
    let remaining: TimeInterval = {
      guard let end = context.state.endsAt else { return 0 }
      return max(0, end.timeIntervalSinceNow)
    }()
    return Text(format(remaining))
  }

  private func format(_ interval: TimeInterval) -> String {
    let total = Int(interval)
    let hours = total / 3600
    let minutes = (total % 3600) / 60
    let seconds = total % 60
    return hours > 0
      ? String(format: "%d:%02d:%02d", hours, minutes, seconds)
      : String(format: "%d:%02d", minutes, seconds)
  }
}

extension Color {
  /// `#RRGGBB` as sent from JavaScript.
  init(hex: String) {
    let cleaned = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    var value: UInt64 = 0
    Scanner(string: cleaned).scanHexInt64(&value)
    self.init(
      .sRGB,
      red: Double((value >> 16) & 0xFF) / 255,
      green: Double((value >> 8) & 0xFF) / 255,
      blue: Double(value & 0xFF) / 255,
      opacity: 1
    )
  }
}

@main
struct DynamicNotchWidgetBundle: WidgetBundle {
  var body: some Widget {
    if #available(iOS 16.2, *) {
      DynamicNotchLiveActivity()
    }
  }
}
