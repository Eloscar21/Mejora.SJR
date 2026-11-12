import { Suspense } from 'react';
import { LoginProvider } from '@/providers/LoginProvider';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center" />}>
      <LoginProvider />
    </Suspense>
  );
}
