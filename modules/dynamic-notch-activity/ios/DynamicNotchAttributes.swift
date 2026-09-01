import Foundation

#if canImport(ActivityKit)
import ActivityKit

/// The contract between the app and the Live Activity widget.
///
/// This file is compiled into BOTH the app target and the widget extension
/// target. ActivityKit matches an activity to its widget by this type, so the
/// two targets must be looking at the same declaration - a copied-and-edited
/// second copy is the usual reason a Live Activity starts but never renders.
///
/// `ContentState` is the part that changes over time and is what an ActivityKit
/// push payload updates. Everything outside it is fixed for the life of the
/// activity.
@available(iOS 16.2, *)
public struct DynamicNotchAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var title: String
    public var subtitle: String?
    public var progress: Double?
    public var status: String
    /// Absolute instants, so the widget can render a self-updating timer with
    /// `Text(timerInterval:)` instead of being pushed a new string every second.
    public var startedAt: Date?
    public var endsAt: Date?
    public var countsUp: Bool
    public var isPaused: Bool

    public init(
      title: String,
      subtitle: String? = nil,
      progress: Double? = nil,
      status: String,
      startedAt: Date? = nil,
      endsAt: Date? = nil,
      countsUp: Bool = false,
      isPaused: Bool = false
    ) {
      self.title = title
      self.subtitle = subtitle
      self.progress = progress
      self.status = status
      self.startedAt = startedAt
      self.endsAt = endsAt
      self.countsUp = countsUp
      self.isPaused = isPaused
    }
  }

  /// Our own activity id, so the JS layer can address a specific activity.
  public var id: String
  public var type: String
  /// SF Symbol name.
  public var symbol: String
  /// `#RRGGBB`.
  public var tintHex: String

  public init(id: String, type: String, symbol: String, tintHex: String) {
    self.id = id
    self.type = type
    self.symbol = symbol
    self.tintHex = tintHex
  }
}
#endif
