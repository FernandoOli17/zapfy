'use client';

import { useRouter } from 'next/navigation';

import { signOut } from '@/lib/auth-client';

export function SignOutLink({
  children,
  className,
  redirectTo = '/login',
}: {
  children: React.ReactNode;
  className?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        router.push(redirectTo);
        router.refresh();
      }}
      className={className}
    >
      {children}
    </button>
  );
}
