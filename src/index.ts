import type { EventSubscription } from 'react-native';
import NativeOneTrace from './NativeOneTrace';

/** SDK settings. */
export type OneTraceConfig = {
  /** The project write key (`cdp_wk_…`) from the OneTrace admin panel. */
  writeKey: string;
  /** The address you open OneTrace at, for example `https://crm.example.com`; `/api/v1` is added automatically. */
  host: string;
  /** Send the queue once it has this many events (20). */
  flushAt?: number;
  /** Send the queue at least this often while the app is running, in seconds (30). */
  flushIntervalSeconds?: number;
  /** Events kept on disk while offline; the oldest are dropped beyond it (1000). */
  maxQueueSize?: number;
  /** Send `app_installed`, `app_updated`, `app_opened` and `app_backgrounded` (true). */
  trackLifecycle?: boolean;
  /** Open the link of a tapped push notification (`cdp_url`) automatically (true). */
  openPushLinks?: boolean;
  /** Log what the SDK does (Logcat, Xcode console). */
  debug?: boolean;
  /**
   * Android: your app passes OneTrace push data to `OneTrace.handlePush` (carousel, timer, buttons, snooze); the
   * installation then reports `rich` and `silent` and the server sends data-only messages. Leave it off without that
   * handling. Ignored on iOS.
   */
  richPush?: boolean;
  /** Remote Config is asked for at most this often (seconds); omitted keeps the native default (one hour). */
  remoteConfigMinFetchIntervalSeconds?: number;
};

/** The result of `enableGeofences()`: anything but `enabled` is the reason the zones are not watched. */
export type GeofenceStatus =
  | 'enabled'
  | 'locationPermissionMissing'
  | 'backgroundPermissionMissing'
  | 'playServicesUnavailable'
  | 'notInitialized'
  | 'needsAlwaysPermission'
  | 'unavailable'
  | 'notSetUp';

/** Push provider of the token passed to `setPushToken`. */
export type PushProvider = 'fcm' | 'apns';

export type Properties = Record<string, unknown>;

export type IdentityOptions = {
  /** Signature of the user id from your server: HMAC-SHA256 of the user id with the project's signing key, hex. */
  userHash?: string | null;
};

/** How a feed card is drawn: the image on the left of the text, above it, or the image only. */
export type FeedCardLayout = 'classic' | 'captioned' | 'banner';

/** A card of the message feed: an offer, news, a reminder or a promo code that stays until it expires or is removed. */
export type FeedCard = {
  /** Identifies the card in the reports: pass it (or the card) to `feedCardShown`, `feedCardClicked`, `feedCardDismissed`. */
  token: string;
  layout: FeedCardLayout;
  /** Shown in bold; for the banner layout the description of the image. */
  title: string;
  body: string | null;
  /** A web address of the image. */
  imageUrl: string | null;
  /** The button label; null when the whole card is the link. */
  buttonText: string | null;
  /** A web page or a deep link of the app. */
  buttonUrl: string | null;
  /** Shown above the other cards. */
  pinned: boolean;
  /** Already shown to the user: not counted as unread. */
  read: boolean;
  createdAt: Date | null;
  expiresAt: Date | null;
  /** A tap anywhere on the card opens `buttonUrl`: a card without a button label, or a banner. */
  opensOnTap: boolean;
};

/** Options of the ready-made feed screen. */
export type FeedScreenOptions = {
  /** Language of the labels on iOS (`de`, `pt-BR`…); the device language by default. Android follows the app locale. */
  language?: string | null;
};

/** Version of this package, reported with every event. */
export const VERSION = '1.2.0';

/** Values the native SDKs take: dates become ISO 8601 strings in UTC, undefined becomes null. */
function value(input: unknown): unknown {
  if (input === undefined || input === null) {
    return null;
  }

  if (input instanceof Date) {
    return input.toISOString();
  }

  if (Array.isArray(input)) {
    return input.map(value);
  }

  if (typeof input === 'object') {
    return values(input as Properties);
  }

  if (typeof input === 'number' && !Number.isFinite(input)) {
    return null;
  }

  return typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean' ? input : String(input);
}

function values(input: Properties): Properties {
  const output: Properties = {};

  for (const [key, item] of Object.entries(input)) {
    output[key] = value(item);
  }

  return output;
}

function strings(data: Record<string, unknown>): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [key, item] of Object.entries(data)) {
    if (item !== undefined && item !== null) {
      output[key] = typeof item === 'string' ? item : JSON.stringify(item);
    }
  }

  return output;
}

function text(input: unknown): string | null {
  return typeof input === 'string' && input !== '' ? input : null;
}

function date(input: unknown): Date | null {
  if (typeof input !== 'string' || input === '') {
    return null;
  }

  const parsed = new Date(input);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** A card as the native SDKs pass it: dates as ISO 8601 strings, missing values as null. */
function feedCard(input: Record<string, unknown>): FeedCard {
  const layout = input.layout;

  return {
    token: String(input.token ?? ''),
    layout: layout === 'captioned' || layout === 'banner' ? layout : 'classic',
    title: typeof input.title === 'string' ? input.title : '',
    body: text(input.body),
    imageUrl: text(input.imageUrl),
    buttonText: text(input.buttonText),
    buttonUrl: text(input.buttonUrl),
    pinned: input.pinned === true,
    read: input.read === true,
    createdAt: date(input.createdAt),
    expiresAt: date(input.expiresAt),
    opensOnTap: input.opensOnTap === true,
  };
}

function feedCards(input: Object[]): FeedCard[] {
  return input.map((card) => feedCard(card as Record<string, unknown>));
}

function token(card: FeedCard | string): string {
  return typeof card === 'string' ? card : card.token;
}

/** Unread count listeners of the app; the native observer runs while there is at least one. */
const unreadListeners = new Set<(count: number) => void>();
let unreadSubscription: EventSubscription | null = null;
let lastUnread: number | null = null;

function addFeedUnreadListener(listener: (count: number) => void): EventSubscription {
  const wrapped = (count: number) => listener(count);
  unreadListeners.add(wrapped);

  if (unreadSubscription === null) {
    unreadSubscription = NativeOneTrace.onFeedUnread((count) => {
      lastUnread = count;
      for (const each of [...unreadListeners]) {
        each(count);
      }
    });
    NativeOneTrace.startFeedUnread();
  } else if (lastUnread !== null) {
    // The native observer reports the count once when it starts; a later listener gets the last one now.
    wrapped(lastUnread);
  }

  return {
    remove() {
      if (!unreadListeners.delete(wrapped) || unreadListeners.size > 0) {
        return;
      }

      NativeOneTrace.stopFeedUnread();
      unreadSubscription?.remove();
      unreadSubscription = null;
      lastUnread = null;
    },
  };
}

/** True when the data of a push message came from OneTrace. */
const remoteConfigListeners = new Set<(keys: string[]) => void>();
let remoteConfigSubscription: EventSubscription | null = null;

function addRemoteConfigListener(listener: (keys: string[]) => void): EventSubscription {
  const wrapped = (keys: string[]) => listener(keys);
  remoteConfigListeners.add(wrapped);

  if (remoteConfigSubscription === null) {
    remoteConfigSubscription = NativeOneTrace.onRemoteConfigChanged((keys) => {
      for (const each of [...remoteConfigListeners]) {
        each(keys);
      }
    });
    NativeOneTrace.startRemoteConfigChanges();
  }

  return {
    remove() {
      if (!remoteConfigListeners.delete(wrapped) || remoteConfigListeners.size > 0) {
        return;
      }

      NativeOneTrace.stopRemoteConfigChanges();
      remoteConfigSubscription?.remove();
      remoteConfigSubscription = null;
    },
  };
}

/** App settings of OneTrace (Apps → Remote Config); every call goes to the native SDK. */
const remoteConfig = {
  getString(key: string, defaultValue: string | null): Promise<string | null> {
    return NativeOneTrace.remoteConfigGetString(key, defaultValue);
  },

  getBoolean(key: string, defaultValue: boolean): Promise<boolean> {
    return NativeOneTrace.remoteConfigGetBool(key, defaultValue);
  },

  getInt(key: string, defaultValue: number): Promise<number> {
    return NativeOneTrace.remoteConfigGetInt(key, defaultValue);
  },

  getDouble(key: string, defaultValue: number): Promise<number> {
    return NativeOneTrace.remoteConfigGetDouble(key, defaultValue);
  },

  /** A JSON value (object or array) as a string for `JSON.parse`. */
  getJson(key: string, defaultValue: string | null): Promise<string | null> {
    return NativeOneTrace.remoteConfigGetJson(key, defaultValue);
  },

  /** Asks the server for fresh values now; true when they were fetched. */
  fetch(): Promise<boolean> {
    return NativeOneTrace.remoteConfigFetch();
  },

  /** The keys that changed after a fetch; the native listener runs while at least one is added. */
  addListener: addRemoteConfigListener,
};

function isOneTraceNotification(data: Record<string, unknown> | undefined | null): boolean {
  return typeof data?.cdp_token === 'string';
}

/**
 * OneTrace.pro: events, screens and identities of app users, installations for mobile push, in-app messages and the
 * message feed.
 * Call `init` once, as early as possible (in `index.js`); every other call does nothing before it.
 */
export const OneTrace = {
  init(config: OneTraceConfig): void {
    NativeOneTrace.setup({ ...config, wrapper: 'react-native', wrapperVersion: VERSION });
  },

  /** Your own event, for example `track('order_completed', { order_id: '1001', amount: 1250.5 })`. */
  track(event: string, properties: Properties = {}): void {
    NativeOneTrace.track(event, values(properties));
  },

  /** A screen of the app: the `$screen` event with the screen name. */
  screen(name: string, properties: Properties = {}): void {
    NativeOneTrace.screen(name, values(properties));
  },

  /**
   * The user signed in or updated their data. Pass null as the user id to update traits of the current visitor.
   *
   * `userHash` is the signature of the user id: HMAC-SHA256 of `userId` with the project's signing key, in hex. Your
   * server computes it after sign-in and returns it to the app; never put the signing key into the app. When the
   * project requires the signature, a user id without it is ignored. The SDK keeps it with the user id and sends it
   * with every event and the installation; a later `identify` of the same user without it keeps the stored one.
   */
  identify(userId: string | null, traits: Properties = {}, options: IdentityOptions = {}): void {
    NativeOneTrace.identify(userId, values(traits), options.userHash ?? null);
  },

  /** Links the current anonymous visitor to a new user id; `userHash` is its signature, as in `identify`. */
  alias(userId: string, options: IdentityOptions = {}): void {
    NativeOneTrace.alias(userId, options.userHash ?? null);
  },

  /** The user signed out: a new anonymous id, and the installation leaves the previous user's profile. */
  reset(): void {
    NativeOneTrace.reset();
  },

  /** Sends queued events now instead of waiting for the next batch. */
  flush(): void {
    NativeOneTrace.flush();
  },

  /** The push token of this installation, for example `await messaging().getToken()`. Null removes it. */
  setPushToken(token: string | null, provider: PushProvider = 'fcm'): void {
    NativeOneTrace.setPushToken(token, provider);
  },

  /** Call after the user answered the notification permission prompt: the platform learns whether push can be sent. */
  notificationPermissionChanged(): void {
    NativeOneTrace.notificationPermissionChanged();
  },

  isOneTraceNotification,

  /** A OneTrace notification reached the app, for example in `messaging().onMessage`: it becomes delivered. */
  notificationReceived(data: Record<string, unknown> | undefined | null): void {
    if (data && isOneTraceNotification(data)) {
      NativeOneTrace.notificationReceived(strings(data));
    }
  },

  /**
   * A OneTrace notification was tapped, for example in `messaging().onNotificationOpenedApp`: the open is reported once
   * and its link opened. Returns false when the data is not from OneTrace.
   */
  /** A tap on a notification or on one of its buttons; `actionId` is the id of the tapped button. */
  notificationOpened(data: Record<string, unknown> | undefined | null, actionId?: string | null): boolean {
    if (!data || !isOneTraceNotification(data)) {
      return false;
    }

    NativeOneTrace.notificationOpened(strings(data), actionId ?? null);

    return true;
  },

  /**
   * Android: the native SDK draws OneTrace push data (carousel, timer, buttons, snooze); call it from your background
   * handler and set `richPush`. Resolves true when the data is OneTrace push. Nothing is drawn on iOS.
   */
  async handlePush(data: Record<string, unknown> | undefined | null): Promise<boolean> {
    if (!data || !isOneTraceNotification(data)) {
      return false;
    }

    return NativeOneTrace.handlePush(strings(data));
  },

  remoteConfig,

  /** Starts watching the geofences of the project; the location permission is yours to ask for. */
  async enableGeofences(): Promise<GeofenceStatus> {
    return (await NativeOneTrace.enableGeofences()) as GeofenceStatus;
  },

  disableGeofences(): void {
    NativeOneTrace.disableGeofences();
  },

  /**
   * Asks for the next missing location permission. Android: true when a prompt was shown, call it again after the
   * answer for «Allow all the time». iOS: starts both steps and resolves true.
   */
  requestLocationPermission(): Promise<boolean> {
    return NativeOneTrace.requestLocationPermission();
  },

  /**
   * Holds in-app messages back while true, for example during checkout; they are shown after it is set back to false
   * and the app opens again or tracks their trigger event.
   */
  pauseInAppMessages(paused: boolean): void {
    NativeOneTrace.pauseInAppMessages(paused);
  },

  /** Asks OneTrace for in-app messages now; the SDK also does it when the app opens and after sending events. */
  fetchInAppMessages(): void {
    NativeOneTrace.fetchInAppMessages();
  },

  anonymousId(): Promise<string | null> {
    return NativeOneTrace.anonymousId();
  },

  userId(): Promise<string | null> {
    return NativeOneTrace.userId();
  },

  /** The installation id: the `mobile_push` identity of the profile while push can be sent. */
  installationId(): Promise<string | null> {
    return NativeOneTrace.installationId();
  },

  /**
   * Loads the message feed of this user: pinned cards first, then the newest, up to 50. On a network error, and before
   * `init`, it resolves with the cards loaded before. Once the app uses the feed, the SDK also refreshes it when the app
   * opens and after `reset()`.
   */
  async fetchFeed(): Promise<FeedCard[]> {
    return feedCards(await NativeOneTrace.fetchFeed());
  },

  /** The feed as last loaded, with the shows, clicks and removals since then; no request. */
  async feedCards(): Promise<FeedCard[]> {
    return feedCards(await NativeOneTrace.feedCards());
  },

  /** Cards of the last loaded feed the user has not seen yet. */
  feedUnreadCount(): Promise<number> {
    return NativeOneTrace.feedUnreadCount();
  },

  /**
   * Calls `listener` with the unread count now and every time it changes, for a badge; loads the feed if it was not
   * loaded yet. Call `remove()` on the result to stop; the native observer runs while any listener is added.
   */
  addFeedUnreadListener,

  /** For your own feed UI: at least half of the card is on screen. Reported once; the card becomes read. */
  feedCardShown(card: FeedCard | string): void {
    NativeOneTrace.feedCardShown(token(card));
  },

  /**
   * For your own feed UI: a tap on the button, or on the card when `opensOnTap`. Reports the click and opens
   * `buttonUrl` as push links are opened; with `openPushLinks: false` only reports it, open the link yourself.
   */
  feedCardClicked(card: FeedCard | string): void {
    NativeOneTrace.feedCardClicked(token(card));
  },

  /** For your own feed UI: the user removed the card; it does not come back. */
  feedCardDismissed(card: FeedCard | string): void {
    NativeOneTrace.feedCardDismissed(token(card));
  },

  /**
   * Opens the ready-made feed screen of the native SDK: cards in their layouts, pinned first, remove buttons, pull to
   * refresh, an empty state; shows and clicks are reported for you. Modal over the top screen on iOS, an activity on
   * Android.
   */
  openFeed(options: FeedScreenOptions = {}): void {
    NativeOneTrace.openFeed(options.language ?? null);
  },
};

export default OneTrace;
