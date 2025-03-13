'use client';

import { useAuth } from '@/app/hooks/useAuth';
import { UserProfile } from '@/app/(user)/profile/components/UserProfile';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="container max-w-2xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <UserProfile user={user} />
        </CardContent>
      </Card>
    </div>
  );
}
