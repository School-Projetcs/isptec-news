import { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider, useTheme, type Palette, type ThemeName } from './lib/theme';
import { LoginScreen } from './screens/LoginScreen';
import { FeedScreen } from './screens/FeedScreen';
import { NewsDetailScreen } from './screens/NewsDetailScreen';
import { UploadScreen } from './screens/UploadScreen';

export type RootStackParamList = {
  Login: undefined;
  Feed: undefined;
  NewsDetail: { slug: string; title: string };
  Upload: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Constrói o tema do React Navigation a partir da paleta efetiva. */
function buildNavTheme(theme: Palette, name: ThemeName): Theme {
  return {
    dark: name === 'dark',
    colors: {
      primary: theme.primary,
      background: theme.bg,
      card: theme.card,
      text: theme.ink,
      border: theme.border,
      notification: theme.primary,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '900' },
    },
  };
}

function Router() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="Feed" component={FeedScreen} options={{ title: 'ISPTEC News' }} />
          <Stack.Screen
            name="NewsDetail"
            component={NewsDetailScreen}
            options={({ route }) => ({ title: route.params.title })}
          />
          <Stack.Screen name="Upload" component={UploadScreen} options={{ title: 'Media · Compressão' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

function Shell() {
  const { theme, name } = useTheme();
  const navTheme = useMemo(() => buildNavTheme(theme, name), [theme, name]);

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <Router />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
