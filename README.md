# OneTrace.pro for React Native

[![CI](https://github.com/OneTracePro/onetrace-react-native/actions/workflows/ci.yml/badge.svg)](https://github.com/OneTracePro/onetrace-react-native/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

The React Native module of [OneTrace.pro](https://onetrace.pro), the customer data platform: events and screens of your app users in the same profiles as your website, CRM and stores — for segments, journeys, predictions and analytics — plus mobile push notifications, in-app messages and the message feed.

The module is a thin TurboModule over the native SDKs, [OneTrace for Android](https://github.com/OneTracePro/onetrace-android) and [OneTrace for iOS](https://github.com/OneTracePro/onetrace-ios): events are queued on disk and sent in batches by native code, and in-app messages and the feed screen are drawn natively over your React Native UI.

- React Native 0.76+ with the New Architecture; Android 7.0+ (API 24), iOS 15.1+ (the React Native minimum).
- The pod compiles the sources of the iOS SDK with the module (`ios/OneTraceSDK`, copied by `scripts/vendor-ios-sdk.sh` at a fixed version): no extra Podfile lines and no dynamic frameworks needed. From Swift in your app, `import onetrace_react_native` gives the iOS SDK API, for example `OneTrace.setPushToken(deviceToken)`.
- Expo: works in a development build (`npx expo prebuild`), not in Expo Go.

## Installation

```bash
npm install github:OneTracePro/onetrace-react-native#v1.2.0
cd ios && pod install
```

## Native code before the release (stage 105)

The features above (rich push, Remote Config, geofences) are in the `stage-105` branches of the native SDKs, which are not released yet:

- Android: `android/build.gradle` takes a commit of the `onetrace-android` branch `stage-105` from JitPack (`com.github.OneTracePro.onetrace-android:onetrace:<commit>`; JitPack builds it on the first request, a couple of minutes). For a local working copy run `./gradlew :onetrace:publishReleasePublicationToMavenLocal :onetrace-fcm:publishReleasePublicationToMavenLocal :onetrace-location:publishReleasePublicationToMavenLocal` there and set `onetrace.mavenLocal=true` in the app's `android/gradle.properties` (`onetrace.androidVersion` picks another version or commit).
- iOS: `ios/OneTraceSDK` is a copy of commit `b975ee14f0823f078d26817ee56673908beee3d8` of the `stage-105` branch (the `OneTrace`, `OneTracePush` and `OneTraceLocation` targets in one module, imports between them removed; `OneTraceLocation` is compiled only with the `Location` subspec); `scripts/vendor-ios-sdk.sh <commit>` refreshes it, `ONETRACE_IOS_REPO=<path>` takes a local clone, and CI checks that the copy matches `ios/OneTraceSDK/VERSION`.

After the native SDKs are released the module switches back to the JitPack tag and the iOS release tag.

## Quick start

In `index.js`, before `AppRegistry.registerComponent`:

```js
import { OneTrace } from 'onetrace-react-native';

OneTrace.init({
  writeKey: 'cdp_wk_…',              // Settings → API keys: a write key
  host: 'https://crm.example.com',   // the address you open OneTrace at
});
```

Then, anywhere:

```js
OneTrace.screen('Product', { product_id: 'SKU-1' });
OneTrace.track('add_to_cart', { product_id: 'SKU-1', price: 49.9 });
OneTrace.identify('u-42', { email: 'anna@example.com' });  // after sign-in
OneTrace.reset();                                          // after sign-out
```

Use the same event names and `product_id` values as on your website — then recommendations, abandoned cart journeys and the reports work across the website and the app. See the [e-commerce events](https://onetrace.pro/en/docs/api).

The SDK sends `app_installed`, `app_updated`, `app_opened` and `app_backgrounded` itself, with the app version, device model, OS version, language and time zone in the context of every event. Dates in properties become ISO 8601 strings in UTC.

Screens with [React Navigation](https://reactnavigation.org/docs/screen-tracking):

```jsx
const navigation = useNavigationContainerRef();
const current = useRef();

<NavigationContainer
  ref={navigation}
  onReady={() => {
    current.current = navigation.getCurrentRoute()?.name;
    OneTrace.screen(current.current);
  }}
  onStateChange={() => {
    const name = navigation.getCurrentRoute()?.name;
    if (name && name !== current.current) {
      OneTrace.screen(name);
    }
    current.current = name;
  }}
>
```

## Signed user ids

The write key ships inside the app, so anyone could call `identify` with someone else's user id and receive that customer's in-app messages and push. Sign the user id on your server to prove it belongs to the signed-in user. When the project requires the signature (**Website → Connection → Server**), a user id without a valid one is ignored: events stay with the anonymous id, and the installation is not registered for that user.

1. Create the signing key on the **Website → Connection → Server** tab and keep it on your server only — never put it into the app.
2. After sign-in, your server returns the signature with the session: HMAC-SHA256 of the user id with the signing key, in hex.

   ```php
   $userHash = hash_hmac('sha256', $userId, getenv('CDP_IDENTITY_KEY'));
   ```

   ```js
   const userHash = crypto.createHmac('sha256', process.env.CDP_IDENTITY_KEY).update(userId).digest('hex');
   ```

3. Pass it to `identify` (and to `alias`):

   ```js
   OneTrace.identify(session.userId, { email: session.email }, { userHash: session.userHash });
   ```

The SDK keeps the signature with the user id and sends it as `userHash` with every event and the installation registration. A later `identify` of the same user without a signature keeps the stored one; another user id or `reset()` clears it. After the key is changed, the previous one is accepted for another 24 hours: return signatures with the new key from your server before then.

## Push notifications

The module does not receive push messages itself — use [@react-native-firebase/messaging](https://rnfirebase.io/messaging/usage) (or your own setup) and pass the token and the messages on:

```js
import messaging from '@react-native-firebase/messaging';

await messaging().requestPermission();
OneTrace.notificationPermissionChanged();
OneTrace.setPushToken(await messaging().getToken());          // FCM, Android and iOS
messaging().onTokenRefresh((token) => OneTrace.setPushToken(token));

messaging().onMessage((message) => OneTrace.notificationReceived(message.data));
messaging().onNotificationOpenedApp((message) => OneTrace.notificationOpened(message.data));
const initial = await messaging().getInitialNotification();
if (initial) {
  OneTrace.notificationOpened(initial.data);
}
```

A tap is reported once and its link (`cdp_url`, `myapp://…` or `https://…`) is opened — set `openPushLinks: false` to handle it yourself. On iOS without Firebase pass the APNs token: `OneTrace.setPushToken(token, 'apns')`.

In OneTrace add the **Mobile push** integration with your package name and bundle id: the Firebase service account for FCM and, for APNs tokens, the APNs key.

### Rich push, buttons and the tapped button (stage 105, unreleased)

Android: the native SDK draws OneTrace push (carousel, timer, buttons, snooze) and Live Updates. Pass `richPush: true` to `OneTrace.init` and hand the data of every message to `OneTrace.handlePush(data)` — from the background handler and from `messaging().onMessage` while the app is open, since data-only messages are not shown by the system then (it resolves false for messages that are not OneTrace's, and true for the silent check, which shows nothing). Only then the installation reports `rich` and `silent` and the server sends data-only messages. Without the flag the server sends the plain notification, as before.

```js
await OneTrace.init({ writeKey: '…', host: '…', richPush: true });
messaging().setBackgroundMessageHandler(async (message) => {
  await OneTrace.handlePush(message.data);
});
messaging().onMessage(async (message) => {
  if (!(await OneTrace.handlePush(message.data))) {
    showYourOwnNotification(message); // not OneTrace's
  }
});
```

On Android the `onMessage` handler replaces the `notificationReceived` call above: `handlePush` reports the delivery itself.

iOS draws rich push in a Notification Service Extension and Notification Content Extension of the native SDK (see its README); `richPush` and `handlePush` do nothing there. A tap on a button is passed with its id: `OneTrace.notificationOpened(message.data, actionId)`. The same tap passed twice (the native delegate and your code) is reported once.

## Remote Config

App settings of OneTrace (**Apps → Remote Config**), read from the device:

```js
const theme = await OneTrace.remoteConfig.getString('theme', 'light');
const enabled = await OneTrace.remoteConfig.getBoolean('new_checkout', false);   // also getInt, getDouble, getJson (a JSON string)
await OneTrace.remoteConfig.fetch();                                              // fresh values now, true when fetched
const subscription = OneTrace.remoteConfig.addListener((keys) => reload(keys));  // keys that changed after a fetch
subscription.remove();
```

`remoteConfigMinFetchIntervalSeconds` in the `init` settings sets how often the SDK asks by itself (one hour by default).

## Geofences

Zones of **Apps → Geofences** produce `geofence_entered`, `geofence_dwelled` and `geofence_exited` events. The native SDK watches the nearest zones. Geofences are connected separately: an app without them gets no location permissions, no Google Play services Location and no CoreLocation code (no location purpose strings); `enableGeofences()` then resolves `'unavailable'`.

**Android.** Add to `android/gradle.properties`:

```properties
onetrace.geofences=true
```

The native `onetrace-location` module then brings `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION` and `RECEIVE_BOOT_COMPLETED` into the app manifest. Android starts the app in the background for a zone transition and after a restart of the phone, and JavaScript does not run then: start the native SDK in `MainApplication.onCreate()` with the same write key and host as `OneTrace.init` in JavaScript (which then only attaches to it):

```kotlin
// android/app/src/main/java/…/MainApplication.kt
override fun onCreate() {
    super.onCreate()
    pro.onetrace.sdk.OneTrace.init(this, pro.onetrace.sdk.OneTraceConfig(writeKey = "cdp_wk_…", host = "https://crm.example.com", richPush = true))
    // … the rest of the React Native template
}
```

Without it a transition in the background waits until the app opens and is sent then with its time.

**iOS.** Add the `Location` subspec to the `Podfile` next to the autolinked pod, and the `NSLocationWhenInUseUsageDescription` and `NSLocationAlwaysAndWhenInUseUsageDescription` strings to Info.plist:

```ruby
pod 'onetrace-react-native/Location', :path => '../node_modules/onetrace-react-native'
```

The location permission is yours to ask for:

```js
await OneTrace.requestLocationPermission();      // Android: call again after the answer for «Allow all the time»
const status = await OneTrace.enableGeofences(); // 'enabled', or the reason it is not
OneTrace.disableGeofences();
```

Call `enableGeofences()` at every app start: iOS starts the app in the background for a zone event, and on Android it registers the zones again (for example after a reinstall).

## Live Activities (iOS)

Not wrapped: they use ActivityKit types. Call `OneTrace.liveActivities` of the native iOS SDK directly from Swift code in your app target (see the native SDK README); the pod already compiles that SDK.

## In-app messages

Messages of the **In-app messages** channel (journeys and campaigns) are fetched when the app opens and after events are sent, and shown over the app as a modal, a banner or a full screen — right away or after their trigger event. Hold them back during checkout with `OneTrace.pauseInAppMessages(true)`, ask for them now with `OneTrace.fetchInAppMessages()`.

## Message feed

Personal cards — an offer, news, a reminder, a promo code — that stay in the app (and in the feed widget of your website) until they expire or the user removes them, with an unread count for a badge. Unlike in-app messages, a card is not shown once and gone: it waits in the feed. Cards are sent by journeys and campaigns through the **Message feed** channel, a feature of the OneTrace plan; without it the feed is empty.

**Ready-made screen.** The native SDKs draw it: cards in their layout (image on the left, image on top, or image only), pinned ones first, a remove button on each, pull to refresh and an empty state. A card at least half visible is reported as shown; a tap on the button — or on a card without a button — reports the click and opens the link like push links.

```js
OneTrace.openFeed();                      // a modal screen on iOS, an activity on Android
OneTrace.openFeed({ language: 'de' });    // iOS: the labels language; the device language by default
```

The labels follow the device language on iOS and the app locale on Android: English, Russian, German, Uzbek, Turkish, Spanish, French, Italian, Portuguese or Chinese, English otherwise. Colors follow the light or dark appearance.

**Unread badge.**

```jsx
const [unread, setUnread] = useState(0);

useEffect(() => {
  const subscription = OneTrace.addFeedUnreadListener(setUnread);  // now and on every change
  return () => subscription.remove();
}, []);
```

While a listener is added, the native SDK observes the feed: it loads it if needed and refreshes it when the app opens. `await OneTrace.feedUnreadCount()` reads the last count.

**Your own UI.** Load the cards and report what the user sees and does — by the card or its `token`:

```js
const cards = await OneTrace.fetchFeed();   // { token, layout, title, body, imageUrl, buttonText, buttonUrl,
                                            //   pinned, read, createdAt, expiresAt, opensOnTap }
OneTrace.feedCardShown(card);               // at least half of the card is on screen; reported once, the card is read
OneTrace.feedCardClicked(card);             // the button, or the card if card.opensOnTap: reports, opens buttonUrl
OneTrace.feedCardDismissed(card);           // removed: never returned again
```

For example, a `FlatList` with `onViewableItemsChanged` (`viewAreaCoveragePercentThreshold: 50`) calling `feedCardShown`, a `Pressable` on the button calling `feedCardClicked`, and a remove button calling `feedCardDismissed` and dropping the card from the state. `await OneTrace.feedCards()` returns the cards held by the SDK without a request. On a network error `fetchFeed` returns the cards loaded before. With `openPushLinks: false` the SDK only reports the click: open `buttonUrl` yourself, for example with your navigation.

## License

MIT
