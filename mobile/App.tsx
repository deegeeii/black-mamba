import 'react-native-url-polyfill/auto'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { ThemeProvider } from './src/contexts/ThemeContext'
import LoginScreen from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import StandingsScreen from './src/screens/StandingsScreen'
import { LeagueProvider } from './src/contexts/LeagueContext'
import MatchupsScreen from './src/screens/MatchupsScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import { StripeProvider } from '@stripe/stripe-react-native'
import BetsScreen from './src/screens/BetsScreen'
import ChatScreen from './src/screens/ChatScreen'
import MyTeamScreen from './src/screens/MyTeamScreen'
import TournamentListScreen from './src/screens/TournamentListScreen'
import TournamentDetailScreen from './src/screens/TournamentDetailScreen'
import DraftScreen from './src/screens/DraftScreen'



const Stack = createNativeStackNavigator()

function RootNavigator() {
    const { session, loading, user } = useAuth()

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
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {session ? (
                        <>
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

                        </>
                    ) : (
                        <Stack.Screen name="Login" component={LoginScreen} />
                    )}
                </Stack.Navigator>
            </ThemeProvider>
        </LeagueProvider>
    )
}

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
