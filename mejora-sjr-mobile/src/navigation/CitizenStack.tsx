import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MOBILE_ROUTES, type CitizenStackParamList } from '../models/navigation.types';
import { CrearReporteView } from '../views/CrearReporteView';

const Stack = createNativeStackNavigator<CitizenStackParamList>();

export function CitizenStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={MOBILE_ROUTES.citizen.screen} component={CrearReporteView} />
    </Stack.Navigator>
  );
}
