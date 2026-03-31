import { Stack } from 'expo-router';
import { COLORS } from '../../src/theme';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.base },
        animation: 'slide_from_right',
      }}
    />
  );
}
