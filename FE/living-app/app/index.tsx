import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';

export default function IndexScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // 로딩 중에는 아무것도 렌더링하지 않음
  }

  if (user) {
    return <Redirect href="/(tabs)/" />;
  }

  return <Redirect href="/login" />;
}
