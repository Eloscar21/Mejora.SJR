import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MOBILE_ROUTES, type AuthStackParamList } from '../models/navigation.types';
import { AuthView } from '../views/AuthView';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/** AuthView conserva sus dos modos existentes: login y registro ciudadano. */
export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={MOBILE_ROUTES.auth.screen} component={AuthView} />
    </Stack.Navigator>
  );
}
