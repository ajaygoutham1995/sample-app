import ExpoModulesCore

#if canImport(ActivityKit)
import ActivityKit
#endif

/// Serialisable mirror of the JS `Activity`. Field names match
/// `LiveActivityPayload` in `src/services/LiveActivityService.ts`.
struct LiveActivityPayload: Record {
  @Field var id: String = ""
  @Field var type: String = ""
  @Field var title: String = ""
  @Field var subtitle: String? = nil
  @Field var symbol: String = "circle.fill"
  @Field var tint: String = "#FFFFFF"
  @Field var progress: Double? = nil
  @Field var status: String = "active"
  /// Epoch milliseconds, matching `Date.now()` on the JS side.
  @Field var startedAt: Double? = nil
  @Field var endsAt: Double? = nil
  @Field var countsUp: Bool = false
  @Field var isPaused: Bool = false
}

public final class DynamicNotchActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DynamicNotchActivity")

    /// Mirrors `LiveActivityAuthorization` in TypeScript.
    Function("getAuthorization") { () -> String in
      #if canImport(ActivityKit)
      guard #available(iOS 16.2, *) else { return "UNSUPPORTED_OS" }
      return ActivityAuthorizationInfo().areActivitiesEnabled ? "ENABLED" : "DENIED"
      #else
      return "UNSUPPORTED_DEVICE"
      #endif
    }

    AsyncFunction("startActivity") { (payload: LiveActivityPayload) -> String? in
      #if canImport(ActivityKit)
      guard #available(iOS 16.2, *) else {
        throw LiveActivityError.unsupportedOS
      }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        throw LiveActivityError.notAuthorized
      }

      let attributes = DynamicNotchAttributes(
        id: payload.id,
        type: payload.type,
        symbol: payload.symbol,
        tintHex: payload.tint
      )

      let state = Self.makeState(from: payload)

      // A stale date tells the system when the content stops being trustworthy,
      // so a Lock Screen left untouched for hours dims rather than lying.
      let staleDate = Self.date(from: payload.endsAt) ?? Date().addingTimeInterval(60 * 60)

      let activity = try Activity.request(
        attributes: attributes,
        content: ActivityContent(state: state, staleDate: staleDate),
        pushType: nil
      )
      return activity.id
      #else
      throw LiveActivityError.unsupportedOS
      #endif
    }

    AsyncFunction("updateActivity") { (payload: LiveActivityPayload) in
      #if canImport(ActivityKit)
      guard #available(iOS 16.2, *) else { return }
      guard let activity = Self.find(payload.id) else { return }

      let staleDate = Self.date(from: payload.endsAt) ?? Date().addingTimeInterval(60 * 60)
      await activity.update(
        ActivityContent(state: Self.makeState(from: payload), staleDate: staleDate)
      )
      #endif
    }

    AsyncFunction("endActivity") { (id: String, dismissImmediately: Bool) in
      #if canImport(ActivityKit)
      guard #available(iOS 16.2, *) else { return }
      guard let activity = Self.find(id) else { return }

      await activity.end(
        nil,
        dismissalPolicy: dismissImmediately ? .immediate : .default
      )
      #endif
    }

    /// Live Activities outlive the app process, so a fresh launch adopts
    /// whatever is still running rather than assuming none exist.
    AsyncFunction("getActiveActivities") { () -> [[String: Any?]] in
      #if canImport(ActivityKit)
      guard #available(iOS 16.2, *) else { return [] }

      return Activity<DynamicNotchAttributes>.activities.map { activity in
        let state = activity.content.state
        return [
          "id": activity.attributes.id,
          "type": activity.attributes.type,
          "title": state.title,
          "subtitle": state.subtitle,
          "symbol": activity.attributes.symbol,
          "tint": activity.attributes.tintHex,
          "progress": state.progress,
          "status": state.status,
          "startedAt": state.startedAt.map { $0.timeIntervalSince1970 * 1000 },
          "endsAt": state.endsAt.map { $0.timeIntervalSince1970 * 1000 },
          "countsUp": state.countsUp,
          "isPaused": state.isPaused,
        ]
      }
      #else
      return []
      #endif
    }
  }

  // MARK: - Helpers

  #if canImport(ActivityKit)
  @available(iOS 16.2, *)
  private static func find(_ id: String) -> Activity<DynamicNotchAttributes>? {
    Activity<DynamicNotchAttributes>.activities.first { $0.attributes.id == id }
  }

  @available(iOS 16.2, *)
  private static func makeState(
    from payload: LiveActivityPayload
  ) -> DynamicNotchAttributes.ContentState {
    DynamicNotchAttributes.ContentState(
      title: payload.title,
      subtitle: payload.subtitle,
      progress: payload.progress,
      status: payload.status,
      startedAt: date(from: payload.startedAt),
      endsAt: date(from: payload.endsAt),
      countsUp: payload.countsUp,
      isPaused: payload.isPaused
    )
  }

  /// JS sends epoch milliseconds; Foundation wants seconds.
  private static func date(from milliseconds: Double?) -> Date? {
    guard let milliseconds else { return nil }
    return Date(timeIntervalSince1970: milliseconds / 1000)
  }
  #else
  private static func date(from milliseconds: Double?) -> Date? { nil }
  #endif
}

enum LiveActivityError: Error, LocalizedError {
  case unsupportedOS
  case notAuthorized

  var errorDescription: String? {
    switch self {
    case .unsupportedOS:
      return "Live Activities require iOS 16.2 or later."
    case .notAuthorized:
      return "Live Activities are disabled for this app in Settings."
    }
  }
}
