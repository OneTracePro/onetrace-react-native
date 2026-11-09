# Changelog

## 1.2.0 — 2026-11-09

- Message feed: `fetchFeed()` and `feedCards()` return the cards (token, layout, title, body, image, button, pinned, read, dates, `opensOnTap`); `addFeedUnreadListener` gives the unread count for a badge and runs the native observer while a listener is added; `feedCardShown`, `feedCardClicked` (opens the link like push links) and `feedCardDismissed` report by the card or its token.
- `openFeed()` opens the ready-made feed screen of the native SDKs, with an optional labels language on iOS.
- Native SDKs 1.2.0 (iOS SDK copy v1.2.0).

## 1.1.0 — 2026-11-02

- Signed user ids: `identify(userId, traits, { userHash })` and `alias(userId, { userHash })` pass the signature from your server to the native SDKs, which send it with every event and the installation registration. Required when the project turns on the user id signature.
- Native SDKs 1.1.0.

## 1.0.0 — 2026-10-31

- A TurboModule over the native OneTrace SDKs for Android and iOS: events, screens, identify, alias and reset; dates in properties become ISO 8601 strings, whole numbers stay whole.
- Mobile push with @react-native-firebase/messaging or your own setup: tokens, permission changes, delivery receipts and taps (reported once, links opened).
- In-app messages drawn by the native SDKs over the React Native UI; pause and fetch on demand.
- The pod compiles the sources of OneTrace for iOS with the module: no Podfile changes, static linking works.
