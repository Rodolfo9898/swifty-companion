import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppRoot from './src/frontend/AppRoot';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppRoot />
    </GestureHandlerRootView>
  );
}
