import { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './lib/auth';
import { SavedProvider } from './lib/saved';
import { ThemeProvider, useTheme, type Palette, type ThemeName } from './lib/theme';
import { useLiveStatus } from './lib/useLiveStatus';
import { LoginScreen } from './screens/LoginScreen';
import { FeedScreen } from './screens/FeedScreen';
import { LiveScreen } from './screens/LiveScreen';
import { AccountScreen } from './screens/AccountScreen';
import { NewsDetailScreen } from './screens/NewsDetailScreen';
import { SavedScreen } from './screens/SavedScreen';
import { UploadScreen } from './screens/UploadScreen';
import { EditProfileScreen } from './screens/EditProfileScreen';
import { ThemeToggle } from './components/ThemeToggle';

export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
  NewsDetail: { slug: string; title: string };
  Saved: undefined;
  Upload: undefined;
  EditProfile: undefined;
};

export type TabParamList = {
  Feed: undefined;
  AoVivo: undefined;
  Conta: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

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

/** Ícone de separador (emoji), atenuado quando inativo. */
function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
  );
}

/** Separadores inferiores (Feed · Ao Vivo · Conta). O separador "Ao Vivo" ganha um
 *  ponto vermelho quando há emissão no ar. */
function Tabs() {
  const { theme } = useTheme();
  const status = useLiveStatus(6000);
  const live = !!status?.live;

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.ink,
        headerTitleStyle: { fontWeight: '800' },
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          title: 'ISPTEC News',
          tabBarLabel: 'Feed',
          tabBarIcon: tabIcon('📰'),
          headerRight: () => <View style={styles.headerRight}><ThemeToggle /></View>,
        }}
      />
      <Tab.Screen
        name="AoVivo"
        component={LiveScreen}
        options={{
          title: 'Ao Vivo',
          tabBarLabel: 'Ao Vivo',
          tabBarIcon: tabIcon('📡'),
          tabBarBadge: live ? '●' : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.live, color: theme.live, fontSize: 8, minWidth: 14, height: 14, lineHeight: 13 },
        }}
      />
      <Tab.Screen
        name="Conta"
        component={AccountScreen}
        options={{ title: 'Conta', tabBarLabel: 'Conta', tabBarIcon: tabIcon('👤') }}
      />
    </Tab.Navigator>
  );
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
        headerTintColor: theme.ink,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="NewsDetail"
            component={NewsDetailScreen}
            options={({ route }) => ({ title: route.params.title })}
          />
          <Stack.Screen name="Saved" component={SavedScreen} options={{ title: 'Guardadas' }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'O meu perfil' }} />
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
        <SavedProvider>
          <Shell />
        </SavedProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRight: { marginRight: 12 },
});
