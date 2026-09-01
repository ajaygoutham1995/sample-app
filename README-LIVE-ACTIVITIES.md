# Layer B — Live Activities (ActivityKit)

Layer A (the in-app Dynamic Notch) runs today with no native work. This document
covers Layer B only: the system Live Activity that appears on the Lock Screen,
and — on iPhone 14 Pro and later — inside Apple's Dynamic Island.

**None of this can be built on Windows.** ActivityKit and WidgetKit need Xcode.
Use EAS Build (`eas build -p ios --profile development`) or a Mac. The app runs
without it; `LiveActivityService` returns `MODULE_UNAVAILABLE` and every call
becomes a no-op, so nothing crashes and nothing silently pretends to work.

## What is already written

| Path | Purpose |
| --- | --- |
| `modules/dynamic-notch-activity/` | Local Expo module. Compiles into the app target. |
| `modules/dynamic-notch-activity/ios/DynamicNotchAttributes.swift` | The `ActivityAttributes` contract. |
| `modules/dynamic-notch-activity/ios/DynamicNotchActivityModule.swift` | start / update / end / restore / authorization. |
| `targets/live-activity/index.swift` | The WidgetKit extension: Lock Screen + Dynamic Island presentations. |
| `targets/live-activity/expo-target.config.js` | Target description for `@bacons/apple-targets`. |
| `src/services/LiveActivityService.ts` | The TypeScript side, with graceful degradation. |

`app.json` already sets `ios.infoPlist.NSSupportsLiveActivities: true`, which is
required — without it `areActivitiesEnabled` is false forever.

## The one step that is not automated

A Live Activity needs a **widget extension target**, which is a second Xcode
target. Expo's Continuous Native Generation deletes and recreates `ios/` on
every `prebuild`, so a target added by hand in Xcode disappears on the next one.
The target has to be declared in config.

```sh
npx expo install @bacons/apple-targets
```

Then add it to `app.json` plugins:

```json
"plugins": [
  "expo-router",
  ["expo-splash-screen", { "...": "..." }],
  "@bacons/apple-targets"
]
```

`targets/live-activity/` is already laid out the way that plugin expects.

```sh
npx expo prebuild --clean
eas build -p ios --profile development
```

### Shared type membership

`DynamicNotchAttributes` must belong to **both** targets — the app target (so it
can start an activity) and the widget target (so WidgetKit can render it).
ActivityKit matches a running activity to its widget by that Swift type.

The failure mode is specific and worth recognising: two separate declarations
that look identical do not match, the activity starts successfully, JS sees a
returned id, and **nothing ever appears on the Lock Screen**. If you hit that,
this is the cause.

After `prebuild`, confirm in Xcode that
`modules/dynamic-notch-activity/ios/DynamicNotchAttributes.swift` has both
targets ticked under *Target Membership*, or move it into a shared group that
both compile.

## Device behaviour

| Device | Presentation |
| --- | --- |
| iPhone X — 14 Plus (physical notch) | In-app Dynamic Notch surface, plus a Lock Screen Live Activity when the app is backgrounded. |
| iPhone 14 Pro and later (Dynamic Island) | System Dynamic Island via ActivityKit **only**. The custom surface is not drawn. |
| Android / web | Neither. Preview mode can simulate the surface for design review. |

The second row is a deliberate product rule, not a limitation: drawing our own
island on top of Apple's would be two competing cutout UIs on the same pixels.

## Push updates (not yet wired)

`Activity.request(pushType:)` is currently `nil`, i.e. local updates only. To
add APNs updates:

1. Pass `.token` as `pushType`.
2. Read `activity.pushToken` and send it to your server.
3. Push to `https://api.push.apple.com/3/device/<token>` with
   `apns-push-type: liveactivity` and a `content-state` payload matching
   `ContentState`.

Local updates cover everything the current app does — a timer's readout is drawn
by `Text(timerInterval:)` on the system side and needs no updates at all.

## Deliberate scope limits

- **The app cannot read other apps' notifications.** iOS gives no third-party
  app that access. Anything claiming to be a notification tracker would either
  be fake or be abusing an accessibility entitlement. This app manages only its
  own notifications and its own activities.
- **No persistent overlay outside the app.** A third-party app cannot draw over
  the Home Screen, the Lock Screen or another app. The in-app surface is exactly
  that — in-app. The supported route to out-of-app presence is ActivityKit,
  which is what Layer B is.
- **No private APIs.** Nothing here touches an undocumented framework.
