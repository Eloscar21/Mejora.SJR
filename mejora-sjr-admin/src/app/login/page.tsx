import { Suspense } from 'react';
import { LoginView } from '@/views/auth/LoginView';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center" />}>
      <LoginView />
    </Suspense>
  );
}
