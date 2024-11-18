// app/components/auth/AuthModal.tsx
import { useState } from 'react';
import { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { useAuth } from './AuthProvider';

type AuthMode = 'signin' | 'signup' | 'confirm' | 'forgot' | 'reset';

export function AuthModal({ onClose, initialMode = 'signin' }: { onClose: () => void; initialMode?: AuthMode }) {
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // First try to sign out any existing session
      try {
        await signOut({ global: true });
        localStorage.clear();
      } catch (signOutError) {
        console.log('No existing session to clear');
      }

      // Then attempt to sign in and get session
      const signInResult = await signIn({ 
        username: email, 
        password,
        options: {
          authFlowType: "USER_SRP_AUTH"
        }
      });
      
      console.log('Sign in result:', {
        isSignedIn: signInResult.isSignedIn,
        nextStep: signInResult.nextStep
      });

      // Make sure we have a complete sign in
      if (!signInResult.isSignedIn) {
        throw new Error('Sign in was not completed');
      }

      // Fetch session immediately after sign in
      const session = await fetchAuthSession();
      console.log('Post-signin session:', {
        hasTokens: !!session.tokens,
        hasCredentials: !!session.credentials,
        identityId: session.identityId
      });

      await refreshUser();
      onClose();
    } catch (err: any) {
      console.error('Error signing in:', err);
      setError(err.message || 'Error signing in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email
          }
        }
      });
      setMode('confirm');
    } catch (err: any) {
      console.error('Error signing up:', err);
      setError(err.message || 'Error signing up');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code
      });
      
      // Add pre-sign-in cleanup
      try {
        await signOut({ global: true });
        localStorage.clear();
      } catch (signOutError) {
        console.log('No existing session to clear');
      }

      // Sign in with same flow as handleSignIn
      const signInResult = await signIn({ 
        username: email, 
        password,
        options: {
          authFlowType: "USER_SRP_AUTH"
        }
      });

      if (!signInResult.isSignedIn) {
        throw new Error('Sign in was not completed after confirmation');
      }

      await refreshUser();
      onClose();
    } catch (err: any) {
      console.error('Error confirming sign up:', err);
      setError(err.message || 'Error confirming sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await resetPassword({ username: email });
      setMode('reset');
    } catch (err: any) {
      console.error('Error requesting password reset:', err);
      setError(err.message || 'Error requesting password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: password
      });
      setMode('signin');
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'signin' ? 'Sign In' :
             mode === 'signup' ? 'Sign Up' :
             mode === 'confirm' ? 'Confirm Email' :
             mode === 'forgot' ? 'Reset Password' :
             'New Password'}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={
          mode === 'signin' ? handleSignIn :
          mode === 'signup' ? handleSignUp :
          mode === 'confirm' ? handleConfirmSignUp :
          mode === 'forgot' ? handleForgotPassword :
          handleResetPassword
        }>
          <div className="space-y-4">
            {mode !== 'confirm' && mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
            )}

            {(mode === 'signin' || mode === 'signup' || mode === 'reset') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
            )}

            {(mode === 'confirm' || mode === 'reset') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmation Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 
               mode === 'signin' ? 'Sign In' :
               mode === 'signup' ? 'Sign Up' :
               mode === 'confirm' ? 'Verify Email' :
               mode === 'forgot' ? 'Send Code' :
               'Reset Password'}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === 'signin' && (
            <>
              <button
                onClick={() => setMode('forgot')}
                className="text-green-600 hover:text-green-700"
              >
                Forgot Password?
              </button>
              <div className="mt-2">
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-green-600 hover:text-green-700"
                >
                  Sign Up
                </button>
              </div>
            </>
          )}
          {mode === 'signup' && (
            <div>
              Already have an account?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-green-600 hover:text-green-700"
              >
                Sign In
              </button>
            </div>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <button
              onClick={() => setMode('signin')}
              className="text-green-600 hover:text-green-700"
            >
              Back to Sign In
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
        >
          <span className="sr-only">Close</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}