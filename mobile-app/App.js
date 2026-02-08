import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CaptureScreen from './src/pages/CaptureScreen';
import { ThemeProvider } from './src/context/ThemeContext';
import { LogProvider } from './src/context/LogContext';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LogProvider>
          <SafeAreaProvider>
            <StatusBar style="auto" />
            <CaptureScreen />
          </SafeAreaProvider>
        </LogProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
