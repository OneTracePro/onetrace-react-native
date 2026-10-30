import { TurboModuleRegistry, type TurboModule } from 'react-native';

/** The native module; use the `OneTrace` API from the package instead. */
export interface Spec extends TurboModule {
  setup(config: Object): void;
  track(event: string, properties: Object): void;
  screen(name: string, properties: Object): void;
  identify(userId: string | null, traits: Object): void;
  alias(userId: string): void;
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
}

export default TurboModuleRegistry.getEnforcing<Spec>('OneTrace');
