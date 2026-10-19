import { router } from 'expo-router';

// Back that still works when a screen was opened directly (deep link, web refresh).
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
