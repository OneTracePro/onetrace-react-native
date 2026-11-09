import { TurboModuleRegistry, type CodegenTypes, type TurboModule } from 'react-native';

/** The native module; use the `OneTrace` API from the package instead. */
export interface Spec extends TurboModule {
  setup(config: Object): void;
  track(event: string, properties: Object): void;
  screen(name: string, properties: Object): void;
  identify(userId: string | null, traits: Object, userHash: string | null): void;
  alias(userId: string, userHash: string | null): void;
  reset(): void;
  flush(): void;
  setPushToken(token: string | null, provider: string): void;
  notificationPermissionChanged(): void;
  notificationReceived(data: Object): void;
  notificationOpened(data: Object): void;
  pauseInAppMessages(paused: boolean): void;
  fetchInAppMessages(): void;
  anonymousId(): Promise<string | null>;
  userId(): Promise<string | null>;
  installationId(): Promise<string | null>;
  fetchFeed(): Promise<Object[]>;
  feedCards(): Promise<Object[]>;
  feedUnreadCount(): Promise<number>;
  startFeedUnread(): void;
  stopFeedUnread(): void;
  feedCardShown(token: string): void;
  feedCardClicked(token: string): void;
  feedCardDismissed(token: string): void;
  openFeed(language: string | null): void;
  readonly onFeedUnread: CodegenTypes.EventEmitter<number>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('OneTrace');
