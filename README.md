# Dynamic Notch

A premium activity surface for iPhones with a **physical notch** — iPhone X
through iPhone 14 Plus. It borrows the interaction language of Apple's Dynamic
Island and applies it to hardware that never got one.

On iPhone 14 Pro and later, the custom surface is deliberately **not** drawn.
Apple owns that cutout; those devices get ActivityKit instead.

## Two layers

**Layer A — the in-app Dynamic Notch.** Pure TypeScript and Reanimated. Runs
today, no native work required. One animated surface that morphs between idle,
compact, charging and expanded states.

**Layer B — system Live Activities.** ActivityKit + WidgetKit, for Lock Screen
and Dynamic Island presentation. Source is written; building it needs Xcode.
See [README-LIVE-ACTIVITIES.md](README-LIVE-ACTIVITIES.md).

## Running it

```sh
npm start
```

Layer A works in Expo Go. Battery (charger) events and notification permission
need a development build — the dashboard has a **Charging → Simulate a charger**
tile that drives the identical code path so the interaction can be reviewed
anywhere.

On a device with no notch (Android, web, a non-notch simulator), turn on
**Settings → Preview mode**, then pick a device under **Simulate device
geometry** to draw the surface with, say, an iPhone 14 Plus's real geometry.

## Architecture

```
Device  ->  Capability  ->  Screen geometry  ->  Safe area
        ->  Notch geometry  ->  Dynamic Notch geometry  ->  Reanimated
```

```
src/
  geometry/      units, device database, notch projection   <- all mm -> pt lives here
  services/      capability, geometry, manager, live activity, notifications, power
  state/         activity / notch / settings stores
  models/        Activity, timeline maths, visual state
  animations/    spring and timing design
  features/      timer, stopwatch, music, download, countdown
  components/dynamic-notch/   the surface and its content layers
  app/           dashboard + settings
modules/dynamic-notch-activity/   local Expo module (Swift, ActivityKit)
targets/live-activity/            WidgetKit extension source
```

### The rules the code holds to

**Millimetres are the design language; points are derived.** The physical notch
reference (27 × 5.35 mm on iPhone 13–14 Plus) becomes points through the panel's
own density: `ppi / 25.4 / scale`. On an iPhone 14 Plus that is 6.0105 pt/mm, so
the notch projects to 162.3 × 32.0 pt. Every layout value in the app is stated
in millimetres and converted in exactly one place. There is no `top: 50` anywhere.

**Visual state and activity state are separate.** An activity can be `active`
while the surface is `COMPACT`; dismissing the UI never cancels the work.

**Time is timestamps, never counters.** `startedAt` / `endsAt` /
`accumulatedPausedMs`. Returning from background is a subtraction, not a repair,
so a timer cannot drift. The readout is written straight into a `TextInput` from
the UI thread — a running timer costs zero React renders per frame.

**One surface, retargeted.** Every state change retargets the same four shared
values (width, height, two corner radii) on a live spring. Interrupt it mid-flight
and it continues from its current position and velocity. Nothing cross-fades
between two components.

**The ears are the layout.** The notch occupies the middle ~162 pt and cannot be
drawn into, so compact content lives in the ~42 pt strips either side of it, and
the expanded card's header uses the same two ears before its body starts below
the notch band.

### Geometry inspector

**Settings → Geometry inspector** overlays the physical notch bounds, the screen
centre line, the current surface bounds and the safe-area boundary, with every
number they were derived from. Development builds only — it returns `null` when
`__DEV__` is false.

## What this app does not do

- **It cannot read other apps' notifications.** iOS gives no third-party app
  that access. This app manages its own notifications only.
- **It cannot draw over the Home Screen, Lock Screen or other apps.** The
  surface is in-app. The supported route to out-of-app presence is ActivityKit.
- **No private APIs**, no undocumented frameworks, no accessibility abuse.

## Status

| Area | State |
| --- | --- |
| Geometry system, 6 notch devices | Done, arithmetic verified |
| Morphing surface, gestures, haptics | Done |
| Charging reaction (±2 mm per side) | Done |
| Timer, stopwatch, music, download, countdown | Done |
| Notification authorisation | Done |
| Live Activity bridge (TS side) | Done, degrades to no-op without the native module |
| ActivityKit module + widget (Swift) | Written, **not compiled** — needs macOS/EAS |
| On-device validation | **Not done** — no iOS hardware available on Windows |
