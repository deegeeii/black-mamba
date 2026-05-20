// ── IMPORTS ────────────────────────────────────────────────────────────────────
import 'react-native-url-polyfill/auto'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View, Platform } from 'react-native'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { ThemeProvider } from './src/contexts/ThemeContext'
import { LeagueProvider, useLeague } from './src/contexts/LeagueContext'
import { StripeProvider } from '@stripe/stripe-react-native'
import LoginScreen from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import StandingsScreen from './src/screens/StandingsScreen'
import MatchupsScreen from './src/screens/MatchupsScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import BetsScreen from './src/screens/BetsScreen'
import ChatScreen from './src/screens/ChatScreen'
import MyTeamScreen from './src/screens/MyTeamScreen'
import TournamentListScreen from './src/screens/TournamentListScreen'
import TournamentDetailScreen from './src/screens/TournamentDetailScreen'
import DraftScreen from './src/screens/DraftScreen'
import LeagueHomeScreen from './src/screens/LeagueHomeScreen'
import HeadlinesScreen from './src/screens/HeadlinesScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import CreateLeagueScreen from './src/screens/CreateLeagueScreen'
import JoinLeagueScreen from './src/screens/JoinLeagueScreen'
import * as Notifications from 'expo-notifications'
import { supabase } from './src/lib/supabase'
import { useEffect } from 'react'

// ── NAVIGATOR ──────────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator()

async function registerForPushNotifications(userId: string) {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
        })
    }
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') return
    const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'e784f0b9-88d8-4e40-8ce8-dd52df01b286',
    })
    await supabase
        .from('profiles')
        .update({ expo_push_token: token.data })
        .eq('id', userId)
}

function AuthenticatedStack() {
    const { leagues, leaguesLoaded } = useLeague()

    if (!leaguesLoaded) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#00cc66" />
            </View>
        )
    }

    const initialRoute = leagues.length === 0 ? 'Onboarding' : 'Dashboard'

    return (
        <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName={initialRoute}
        >
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="CreateLeague" component={CreateLeagueScreen} />
            <Stack.Screen name="JoinLeague" component={JoinLeagueScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Standings" component={StandingsScreen} />
            <Stack.Screen name="Matchups" component={MatchupsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Bets" component={BetsScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="MyTeam" component={MyTeamScreen} />
            <Stack.Screen name="Arena" component={TournamentListScreen} />
            <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
            <Stack.Screen name="Draft" component={DraftScreen} />
            <Stack.Screen name="LeagueHome" component={LeagueHomeScreen} />
            <Stack.Screen name="Headlines" component={HeadlinesScreen} />
        </Stack.Navigator>
    )
}




function RootNavigator() {
    const { session, loading, user } = useAuth()

    useEffect(() => {
        if (!user) return
        registerForPushNotifications(user.id)
    }, [user?.id])
    

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#00cc66" />
            </View>
        )
    }

    return (
        <LeagueProvider userId={user?.id ?? null}>
            <ThemeProvider userId={user?.id ?? null}>
                {session ? (
                    <AuthenticatedStack />
                ) : (
                    <Stack.Navigator screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="Login" component={LoginScreen} />
                    </Stack.Navigator>
                )}
            </ThemeProvider>
        </LeagueProvider>
    )
}
    

// ── ROOT APP ───────────────────────────────────────────────────────────────────
export default function App() {
    return (
        <StripeProvider
            publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
            merchantIdentifier="merchant.com.blackmambe"
        >
            <AuthProvider>
                <NavigationContainer>
                    <RootNavigator />
                </NavigationContainer>
            </AuthProvider>
        </StripeProvider>
    )
}
