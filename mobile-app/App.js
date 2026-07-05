import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CaptureScreen from './src/pages/CaptureScreen';
import AuthScreen from './src/pages/AuthScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LogProvider } from './src/context/LogContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LocaleProvider } from './src/context/LocaleContext';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

function Root() {
  const { isAuthenticated, initializing } = useAuth();
  const { colors: themeColors } = useTheme();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // LogProvider mounts after sign-in, so logs/collections load fresh per session
  return (
    <LogProvider>
      <CaptureScreen />
    </LogProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LocaleProvider>
          <AuthProvider>
            <SafeAreaProvider>
              <StatusBar style="auto" />
              <Root />
            </SafeAreaProvider>
          </AuthProvider>
        </LocaleProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
