/**
 * Widget extension target for @bacons/apple-targets.
 *
 * Live Activities require a real WidgetKit extension target in the Xcode
 * project. Expo's Continuous Native Generation deletes and recreates ios/ on
 * every prebuild, so the target has to be described in config rather than
 * added by hand in Xcode - otherwise the next prebuild removes it.
 */
module.exports = {
  type: 'widget',
  name: 'DynamicNotchLiveActivity',
  // Live Activities need no App Group unless the app and widget share files.
  // Add one here if the widget ever has to read app data directly.
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  deploymentTarget: '16.2',
};
