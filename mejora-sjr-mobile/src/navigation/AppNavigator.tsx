import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { MOBILE_ROUTES, type RootStackParamList } from '../models/navigation.types';
import { useNavigationViewModel } from '../viewModels/useNavigationViewModel';
import { SplashView } from '../views/SplashView';
import { SessionClosingView } from '../views/SessionClosingView';
import { COLORS } from '../constants/theme';
import { AuthStack } from './AuthStack';
import { CitizenStack } from './CitizenStack';
import { WorkerStack } from './WorkerStack';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.textPrimary,
    border: COLORS.border,
  },
};

/** Monta un único árbol de rutas a partir de la sesión; no ejecuta validaciones ni HTTP. */
export function AppNavigator() {
  const { destination, sessionKey, sessionCloseStatus, sessionCloseError, reintentarCierre } = useNavigationViewModel();

  return (
    <View style={styles.container}>
      <StatusBar style={destination === 'splash' ? 'light' : 'dark'} />
      {destination === 'splash' ? <SplashView /> : destination === 'closing' ? (
        <SessionClosingView error={sessionCloseError} isBusy={sessionCloseStatus !== 'failed'} onRetry={reintentarCierre} />
      ) : (
        <NavigationContainer theme={theme}>
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {destination === 'citizen' ? (
              <RootStack.Screen name={MOBILE_ROUTES.citizen.stack} component={CitizenStack} navigationKey={sessionKey} />
            ) : destination === 'worker' ? (
              <RootStack.Screen name={MOBILE_ROUTES.worker.stack} component={WorkerStack} navigationKey={sessionKey} />
            ) : (
              <RootStack.Screen name={MOBILE_ROUTES.auth.stack} component={AuthStack} navigationKey={sessionKey} />
            )}
          </RootStack.Navigator>
        </NavigationContainer>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
