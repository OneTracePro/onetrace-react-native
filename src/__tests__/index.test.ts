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
