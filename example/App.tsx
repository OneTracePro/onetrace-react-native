import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { OneTrace } from 'onetrace-react-native';

type Product = { id: string; name: string; price: number };

const products: Product[] = [
  { id: 'SKU-1', name: 'Running shoes', price: 89.9 },
  { id: 'SKU-2', name: 'Trail jacket', price: 149.0 },
  { id: 'SKU-3', name: 'Water bottle', price: 12.5 },
];

/** A local OneTrace from the Android emulator (10.0.2.2 is the computer) or the iOS simulator. */
const localHost = Platform.OS === 'android' ? 'http://10.0.2.2:8180' : 'http://localhost:8180';

/**
 * The example asks for the write key on the first screen, so no key is kept in the repository. In your app call
 * `OneTrace.init()` once in `index.js`.
 */
export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.screen}>{started ? <Shop /> : <Setup onStart={() => setStarted(true)} />}</SafeAreaView>
    </SafeAreaProvider>
  );
}

function Setup({ onStart }: { onStart: () => void }) {
  const [writeKey, setWriteKey] = useState('');
  const [host, setHost] = useState(localHost);

  const start = () => {
    OneTrace.init({ writeKey: writeKey.trim(), host: host.trim(), flushAt: 1, debug: true });
    onStart();
  };

  return (
    <View style={styles.content}>
      <Text style={styles.title}>OneTrace demo shop</Text>
      <Text style={styles.label}>Write key</Text>
      <TextInput testID="writeKey" style={styles.input} value={writeKey} onChangeText={setWriteKey} placeholder="cdp_wk_…" autoCapitalize="none" autoCorrect={false} />
      <Text style={styles.label}>OneTrace address</Text>
      <TextInput testID="host" style={styles.input} value={host} onChangeText={setHost} autoCapitalize="none" autoCorrect={false} />
      <Button title="Start" onPress={start} disabled={writeKey.trim() === ''} primary />
    </View>
  );
}

function Shop() {
  const [product, setProduct] = useState<Product | null>(null);
  const [ids, setIds] = useState<{ userId: string | null; anonymousId: string | null; installationId: string | null }>({ userId: null, anonymousId: null, installationId: null });
  const [notice, setNotice] = useState('');

  const refreshIds = async () => {
    const [userId, anonymousId, installationId] = await Promise.all([OneTrace.userId(), OneTrace.anonymousId(), OneTrace.installationId()]);
    setIds({ userId, anonymousId, installationId });
  };

  useEffect(() => {
    refreshIds();
  }, []);

  useEffect(() => {
    if (product) {
      OneTrace.screen('Product', { product_id: product.id });
      OneTrace.track('product_viewed', { product_id: product.id, price: product.price });
    } else {
      OneTrace.screen('Home');
    }
  }, [product]);

  const signIn = async () => {
    OneTrace.identify('demo-anna', { email: 'anna@example.com', first_name: 'Anna' });
    OneTrace.track('signed_in');
    await refreshIds();
  };

  const signOut = async () => {
    OneTrace.reset();
    await refreshIds();
  };

  if (product) {
    return (
      <View style={styles.content}>
        <Button title="← Back" onPress={() => setProduct(null)} />
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.price}>{product.price}</Text>
        <Button
          title="Add to cart"
          primary
          onPress={() => {
            OneTrace.track('add_to_cart', { product_id: product.id, price: product.price, quantity: 1 });
            setNotice('Added to cart');
          }}
        />
        {notice !== '' && <Text style={styles.label}>{notice}</Text>}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>OneTrace demo shop</Text>
      {products.map((item) => (
        <Pressable key={item.id} style={styles.row} onPress={() => { setNotice(''); setProduct(item); }}>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.label}>{item.price}</Text>
        </Pressable>
      ))}
      <View style={styles.buttons}>
        {ids.userId ? <Button title="Sign out" onPress={signOut} /> : <Button title="Sign in as Anna" onPress={signIn} primary />}
        <Button title="Check in-app messages" onPress={() => OneTrace.fetchInAppMessages()} />
        <Button title="Send events now" onPress={() => OneTrace.flush()} />
      </View>
      <Text selectable style={styles.ids}>
        {`User: ${ids.userId ?? '—'}\nAnonymous id: ${ids.anonymousId ?? '—'}\nInstallation: ${ids.installationId ?? '—'}`}
      </Text>
    </ScrollView>
  );
}

function Button({ title, onPress, primary, disabled }: { title: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.button, primary && styles.primary, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, primary && styles.primaryText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8ff' },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 26, color: '#1d1b20', marginVertical: 8 },
  price: { fontSize: 32, color: '#1d1b20' },
  label: { fontSize: 14, color: '#49454f' },
  input: { borderWidth: 1, borderColor: '#79747e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#1d1b20' },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#cac4d0' },
  rowTitle: { fontSize: 18, color: '#1d1b20' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  button: { borderWidth: 1, borderColor: '#79747e', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 10, alignSelf: 'flex-start' },
  primary: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  disabled: { opacity: 0.4 },
  buttonText: { fontSize: 15, color: '#4f46e5' },
  primaryText: { color: '#ffffff' },
  ids: { fontSize: 12, color: '#49454f', marginTop: 8 },
});
