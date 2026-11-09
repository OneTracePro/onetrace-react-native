import { OneTrace, VERSION } from '../index';
import NativeOneTrace from '../NativeOneTrace';

jest.mock('../NativeOneTrace', () => ({
  __esModule: true,
  default: new Proxy({} as Record<string, jest.Mock>, {
    get: (mocks, name: string) => (mocks[name] ??= jest.fn()),
  }),
}));

const native = NativeOneTrace as unknown as Record<string, jest.Mock>;

beforeEach(() => jest.clearAllMocks());

test('starts the native SDK with the settings and the wrapper version', () => {
  OneTrace.init({ writeKey: 'cdp_wk_test', host: 'https://crm.example.com', debug: true });

  expect(native.setup).toHaveBeenCalledWith({
    writeKey: 'cdp_wk_test',
    host: 'https://crm.example.com',
    debug: true,
    wrapper: 'react-native',
    wrapperVersion: VERSION,
  });
});

test('turns dates, undefined and other objects into values the native SDKs take', () => {
  OneTrace.track('order_completed', {
    amount: 1250.5,
    items: [{ product_id: 'SKU-1', quantity: 1 }],
    paid_at: new Date(Date.UTC(2026, 9, 30, 12)),
    coupon: undefined,
    ratio: Number.NaN,
  });

  expect(native.track).toHaveBeenCalledWith('order_completed', {
    amount: 1250.5,
    items: [{ product_id: 'SKU-1', quantity: 1 }],
    paid_at: '2026-10-30T12:00:00.000Z',
    coupon: null,
    ratio: null,
  });
});

test('passes on only OneTrace notifications', () => {
  expect(OneTrace.notificationOpened({ 'google.message_id': '1' })).toBe(false);
  OneTrace.notificationReceived({ title: 'Not ours' });
  OneTrace.notificationReceived(undefined);
  expect(native.notificationOpened).not.toHaveBeenCalled();
  expect(native.notificationReceived).not.toHaveBeenCalled();

  expect(OneTrace.notificationOpened({ cdp_token: 'abc.def', cdp_url: 'shopapp://sale', badge: 2, empty: null })).toBe(true);
  expect(native.notificationOpened).toHaveBeenCalledWith({ cdp_token: 'abc.def', cdp_url: 'shopapp://sale', badge: '2' });
});

test('sends identities and push tokens', () => {
  OneTrace.identify('u-42', { email: 'anna@example.com' });
  OneTrace.identify('u-42', {}, { userHash: 'a1b2' });
  OneTrace.alias('u-43', { userHash: 'c3d4' });
  OneTrace.setPushToken('apns-token', 'apns');
  OneTrace.setPushToken('fcm-token');

  expect(native.identify!.mock.calls).toEqual([
    ['u-42', { email: 'anna@example.com' }, null],
    ['u-42', {}, 'a1b2'],
  ]);
  expect(native.alias).toHaveBeenCalledWith('u-43', 'c3d4');
  expect(native.setPushToken!.mock.calls).toEqual([
    ['apns-token', 'apns'],
    ['fcm-token', 'fcm'],
  ]);
});

test('turns feed cards of the native SDKs into typed cards', async () => {
  native.fetchFeed!.mockResolvedValueOnce([
    {
      token: 'f.1',
      layout: 'banner',
      title: 'Winter sale',
      body: null,
      imageUrl: 'https://cdn.example.com/sale.jpg',
      buttonText: null,
      buttonUrl: 'shopapp://sale',
      pinned: true,
      read: false,
      createdAt: '2026-11-09T10:00:00.000Z',
      expiresAt: null,
      opensOnTap: true,
    },
    { token: 'f.2', layout: 'unknown', title: 'News', body: 'Read more', pinned: false, read: true, createdAt: 'not a date' },
  ]);

  const cards = await OneTrace.fetchFeed();

  expect(cards).toEqual([
    {
      token: 'f.1',
      layout: 'banner',
      title: 'Winter sale',
      body: null,
      imageUrl: 'https://cdn.example.com/sale.jpg',
      buttonText: null,
      buttonUrl: 'shopapp://sale',
      pinned: true,
      read: false,
      createdAt: new Date(Date.UTC(2026, 10, 9, 10)),
      expiresAt: null,
      opensOnTap: true,
    },
    {
      token: 'f.2',
      layout: 'classic',
      title: 'News',
      body: 'Read more',
      imageUrl: null,
      buttonText: null,
      buttonUrl: null,
      pinned: false,
      read: true,
      createdAt: null,
      expiresAt: null,
      opensOnTap: false,
    },
  ]);

  OneTrace.feedCardShown(cards[0]!);
  OneTrace.feedCardClicked('f.1');
  OneTrace.feedCardDismissed(cards[1]!);
  OneTrace.openFeed();
  OneTrace.openFeed({ language: 'de' });

  expect(native.feedCardShown).toHaveBeenCalledWith('f.1');
  expect(native.feedCardClicked).toHaveBeenCalledWith('f.1');
  expect(native.feedCardDismissed).toHaveBeenCalledWith('f.2');
  expect(native.openFeed!.mock.calls).toEqual([[null], ['de']]);
});

test('runs the native unread observer while the app listens', () => {
  const emitted: Array<(count: number) => void> = [];
  const nativeSubscription = { remove: jest.fn() };
  native.onFeedUnread!.mockImplementation((handler: (count: number) => void) => {
    emitted.push(handler);

    return nativeSubscription;
  });

  const badge = jest.fn();
  const menu = jest.fn();
  const first = OneTrace.addFeedUnreadListener(badge);
  expect(native.startFeedUnread).toHaveBeenCalledTimes(1);

  emitted[0]!(3);
  const second = OneTrace.addFeedUnreadListener(menu);
  expect(native.startFeedUnread).toHaveBeenCalledTimes(1);
  expect(menu).toHaveBeenCalledWith(3);

  emitted[0]!(1);
  expect(badge.mock.calls).toEqual([[3], [1]]);
  expect(menu.mock.calls).toEqual([[3], [1]]);

  first.remove();
  first.remove();
  expect(native.stopFeedUnread).not.toHaveBeenCalled();

  second.remove();
  expect(native.stopFeedUnread).toHaveBeenCalledTimes(1);
  expect(nativeSubscription.remove).toHaveBeenCalledTimes(1);

  OneTrace.addFeedUnreadListener(badge).remove();
  expect(native.startFeedUnread).toHaveBeenCalledTimes(2);
  expect(native.stopFeedUnread).toHaveBeenCalledTimes(2);
});
