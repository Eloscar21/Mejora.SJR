import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MOBILE_ROUTES, type WorkerStackParamList } from '../models/navigation.types';
import { BandejaProvider } from '../providers/BandejaProvider';

const Stack = createNativeStackNavigator<WorkerStackParamList>();

export function WorkerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={MOBILE_ROUTES.worker.screen} component={BandejaProvider} />
    </Stack.Navigator>
  );
}
