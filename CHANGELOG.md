# Changelog

## 1.0.0 — 2026-10-30

- A TurboModule over the native OneTrace SDKs for Android and iOS: events, screens, identify, alias and reset; dates in properties become ISO 8601 strings, whole numbers stay whole.
- Mobile push with @react-native-firebase/messaging or your own setup: tokens, permission changes, delivery receipts and taps (reported once, links opened).
- In-app messages drawn by the native SDKs over the React Native UI; pause and fetch on demand.
- The pod compiles the sources of OneTrace for iOS with the module: no Podfile changes, static linking works.
