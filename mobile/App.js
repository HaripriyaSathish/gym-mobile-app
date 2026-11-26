import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth';
import PhoneFrame from './src/components/PhoneFrame';
import { onNotificationTap, registerForPush } from './src/push';
import { Brand, Pop } from './src/components/ui';
import AttendanceScreen from './src/screens/AttendanceScreen';
import BatchScreen from './src/screens/BatchScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ProgramScreen from './src/screens/ProgramScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import CoachAttendanceScreen from './src/screens/coach/CoachAttendanceScreen';
import CoachDietEditorScreen from './src/screens/coach/CoachDietEditorScreen';
import CoachDietScreen from './src/screens/coach/CoachDietScreen';
import CoachFeesScreen from './src/screens/coach/CoachFeesScreen';
import CoachHomeScreen from './src/screens/coach/CoachHomeScreen';
import CoachMembersScreen from './src/screens/coach/CoachMembersScreen';
import CoachMessagesScreen from './src/screens/coach/CoachMessagesScreen';
import VideoScreen from './src/screens/VideoScreen';
import { colors, fonts } from './src/theme';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Smooth, bar-less scrolling inside the phone frame on desktop browsers.
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root { height: 100%; overflow: hidden; background: #FFF3EA; overscroll-behavior: none; }
    * { scrollbar-width: none; -webkit-tap-highlight-color: transparent; }
    *::-webkit-scrollbar { display: none; }
    [data-testid], div { scroll-behavior: smooth; }
    input:focus { outline: none; }
  `;
  document.head.appendChild(style);
  document.title = 'PulseForge Fitness';
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary, card: '#fff', text: colors.navy, border: colors.border } };

const TAB_ICONS = { Home: 'home', Gallery: 'images', Batch: 'chatbubbles', Pay: 'wallet', Me: 'person',
  Dashboard: 'grid', Attendance: 'checkmark-done-circle', Messages: 'chatbubbles', Members: 'people', Fees: 'wallet' };

function useTabOptions() {
  const insets = useSafeAreaInsets();
  const inFrame = Platform.OS === 'web';
  const bottom = inFrame ? 22 : Math.max(insets.bottom, 8);
  return ({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#A3A9BC',
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { height: 58 + bottom, paddingBottom: bottom, paddingTop: 6, backgroundColor: '#fff',
          borderTopColor: colors.border, boxShadow: '0px -4px 20px rgba(27,35,64,0.05)' },
        tabBarIcon: ({ color, focused, size }) => (
          <Pop active={focused}><Ionicons name={focused ? TAB_ICONS[route.name] : `${TAB_ICONS[route.name]}-outline`} size={size - 2} color={color} /></Pop>
        ),
        sceneStyle: { backgroundColor: colors.bg },
        animation: 'shift',
      });
}

function Tabs() {
  const screenOptions = useTabOptions();
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} />
      {/* Built in the background at startup so its photos are ready the first time it is opened */}
      <Tab.Screen name="Gallery" component={GalleryScreen} options={{ lazy: false }} />
      <Tab.Screen name="Batch" component={BatchScreen} />
      <Tab.Screen name="Pay" component={PaymentsScreen} />
      <Tab.Screen name="Me" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/** Trainer app: the admin panel's day-to-day screens for the trainer's own batches. */
function CoachTabs() {
  const screenOptions = useTabOptions();
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Dashboard" component={CoachHomeScreen} />
      <Tab.Screen name="Attendance" component={CoachAttendanceScreen} />
      <Tab.Screen name="Messages" component={CoachMessagesScreen} />
      <Tab.Screen name="Members" component={CoachMembersScreen} />
      <Tab.Screen name="Fees" component={CoachFeesScreen} />
    </Tab.Navigator>
  );
}

const navRef = createNavigationContainerRef();

function Root() {
  const { ready, token, role } = useAuth();
  const insets = useSafeAreaInsets();

  // Members: register this phone for push (missed workout, coach messages) once signed in
  useEffect(() => {
    if (token && role === 'member') registerForPush();
  }, [token, role]);

  // Tapping a notification opens the right tab
  useEffect(() => {
    if (!token || role !== 'member') return undefined;
    return onNotificationTap((data) => {
      const go = () => navRef.navigate('Tabs', data.screen === 'Batch'
        ? { screen: 'Batch', params: { tab: data.tab || 'messages' } } : { screen: 'Home' });
      if (navRef.isReady()) go();
      else setTimeout(go, 800);
    });
  }, [token, role]);

  if (!ready) return <Splash />;
  return (
    <View style={{ flex: 1, paddingTop: Platform.OS === 'web' ? 0 : insets.top, backgroundColor: colors.bg }}>
      <NavigationContainer ref={navRef} theme={navTheme} documentTitle={{ formatter: () => 'PulseForge Fitness' }}>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
          {token && role === 'trainer' ? (
            <>
              <Stack.Screen name="Coach" component={CoachTabs} />
              <Stack.Screen name="Diet" component={CoachDietScreen} />
              <Stack.Screen name="DietEditor" component={CoachDietEditorScreen} />
            </>
          ) : token ? (
            <>
              <Stack.Screen name="Tabs" component={Tabs} />
              <Stack.Screen name="Program" component={ProgramScreen} />
              <Stack.Screen name="Video" component={VideoScreen} />
              <Stack.Screen name="Attendance" component={AttendanceScreen} />
              <Stack.Screen name="Reminders" component={RemindersScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <Brand size={36} />
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({
    BebasNeue_400Regular, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <PhoneFrame>
        <AuthProvider>
          {loaded ? <Root /> : <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>}
        </AuthProvider>
      </PhoneFrame>
    </SafeAreaProvider>
  );
}
