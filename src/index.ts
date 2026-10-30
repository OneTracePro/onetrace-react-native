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
};

/** Push provider of the token passed to `setPushToken`. */
export type PushProvider = 'fcm' | 'apns';

export type Properties = Record<string, unknown>;

/** Version of this package, reported with every event. */
export const VERSION = '1.0.0';

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

/** True when the data of a push message came from OneTrace. */
function isOneTraceNotification(data: Record<string, unknown> | undefined | null): boolean {
  return typeof data?.cdp_token === 'string';
}

/**
 * OneTrace.pro: events, screens and identities of app users, installations for mobile push and in-app messages.
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

  /** The user signed in or updated their data. Pass null as the user id to update traits of the current visitor. */
  identify(userId: string | null, traits: Properties = {}): void {
    NativeOneTrace.identify(userId, values(traits));
  },

  /** Links the current anonymous visitor to a new user id. */
  alias(userId: string): void {
    NativeOneTrace.alias(userId);
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
  notificationOpened(data: Record<string, unknown> | undefined | null): boolean {
    if (!data || !isOneTraceNotification(data)) {
      return false;
    }

    NativeOneTrace.notificationOpened(strings(data));

    return true;
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
};

export default OneTrace;
