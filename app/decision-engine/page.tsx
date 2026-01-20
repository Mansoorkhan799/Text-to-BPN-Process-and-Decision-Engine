'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DecisionEngine from '../components/DecisionEngine';

export default function DecisionEnginePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/check', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          router.push('/signin');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/signin');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Decision Engine...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <DecisionEngine user={user} />;
}
