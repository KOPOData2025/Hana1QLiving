import { Stack } from 'expo-router';

export default function InvestmentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="products" />
      <Stack.Screen name="product-detail" />
      <Stack.Screen name="portfolio" />
      <Stack.Screen name="order" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="transactions" />
      <Stack.Screen name="account-link" />
      <Stack.Screen name="map" />
      <Stack.Screen name="building-analysis" />
      <Stack.Screen name="simulation-input" />
      <Stack.Screen name="simulation-result" />
    </Stack>
  );
}