import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CaptureScreen from './src/pages/CaptureScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <CaptureScreen />
    </SafeAreaProvider>
  );
}
