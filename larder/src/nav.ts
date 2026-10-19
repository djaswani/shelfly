import { router } from 'expo-router';

// Back that still works when a screen was opened directly (deep link, web refresh).
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

// Close every open modal (Add → Receipt → …) and land back on the tabs.
export function closeAll() {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}
