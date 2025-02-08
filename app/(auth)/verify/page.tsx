'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  ConfirmationProvider,
  useConfirmation,
} from '@/app/components/auth/ConfirmationProvider';
import { useRouter } from 'next/navigation';

function VerifyContent() {
  const { status, message } = useConfirmation();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Email Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            {status === 'loading' && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              </div>
            )}
            {status === 'success' && (
              <div className="flex flex-col items-center space-y-2">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <p className="text-sm text-green-600 font-medium">{message}</p>
              </div>
            )}
            {status === 'error' && (
              <div className="flex flex-col items-center space-y-2">
                <XCircle className="h-16 w-16 text-red-500" />
                <Alert variant="destructive">
                  <AlertDescription className="text-center">
                    {message}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {status !== 'loading' && (
              <Button
                className="w-full mt-4"
                onClick={() =>
                  router.push(status === 'success' ? '/login' : '/')
                }
              >
                {status === 'success' ? 'Continue to Login' : 'Return to Home'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <ConfirmationProvider>
      <VerifyContent />
    </ConfirmationProvider>
  );
}
