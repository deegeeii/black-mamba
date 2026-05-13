import 'react-native-url-polyfill/auto'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { ThemeProvider } from './src/contexts/ThemeContext'
import LoginScreen from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'

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
        <ThemeProvider userId={user?.id ?? null}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {session ? (
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </ThemeProvider>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <NavigationContainer>
                <RootNavigator />
            </NavigationContainer>
        </AuthProvider>
    )
}
