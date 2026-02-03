import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Lock, Mail, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOTP] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      
      setLoading(false);
      
      // Set the generated OTP
      setGeneratedOTP(response.data.otp);
      
      // Show OTP as a prominent toast notification (website alert style)
      toast.success(
        `🔐 Your OTP Code: ${response.data.otp}`,
        {
          duration: 30000, // Show for 30 seconds
          description: 'Enter this code in the verification form below',
          style: {
            background: '#fef3c7',
            border: '2px solid #f59e0b',
            color: '#92400e',
            fontSize: '18px',
            fontWeight: 'bold',
            padding: '20px'
          }
        }
      );
      
      // Set showOTP to display verification form
      setShowOTP(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/verify-otp`, { email, otp });
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success('Login successful!');
      
      // Redirect based on role
      const role = response.data.user.role;
      if (role === 'student') navigate('/student');
      else if (role === 'teacher') navigate('/teacher');
      else if (role === 'admin') navigate('/admin');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 grid grid-cols-1 lg:grid-cols-2">
      {/* Left Side - Image */}
      <div className="hidden lg:block relative">
        <img
          src="https://images.unsplash.com/photo-1664273891579-22f28332f3c4"
          alt="University Campus"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-12">
          <div>
            <h1 className="text-white font-serif text-4xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              University Resume Portal
            </h1>
            <p className="text-slate-200 text-lg">Secure Academic Feedback System</p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {!showOTP ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-full mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Sign In
                </h2>
                <p className="text-slate-600 mt-2">Enter your credentials to access your account</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@university.edu"
                      className="pl-10 h-11 rounded-md border-slate-200 bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                      data-testid="login-email-input"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 h-11 rounded-md border-slate-200 bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                      data-testid="login-password-input"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-md px-6 py-2 h-11 font-medium active:scale-95 transition-all"
                  disabled={loading}
                  data-testid="login-submit-button"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-slate-600 text-sm">
                  Don't have an account?{' '}
                  <button
                    onClick={() => navigate('/register')}
                    className="text-slate-900 font-medium hover:underline"
                    data-testid="go-to-register-button"
                  >
                    Register here
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-4">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Verify OTP
                </h2>
                <p className="text-slate-600 mt-2">Enter the 6-digit code from the popup alert</p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <Label htmlFor="otp" className="text-sm font-medium text-slate-700 mb-1.5 block">
                    One-Time Password
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOTP(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="h-11 rounded-md border-slate-200 bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                    required
                    data-testid="otp-input"
                  />
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Didn't see the popup? Check if popups are blocked in your browser
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-md px-6 py-2 h-11 font-medium active:scale-95 transition-all"
                  disabled={loading}
                  data-testid="verify-otp-button"
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowOTP(false);
                    setGeneratedOTP('');
                    setOTP('');
                  }}
                  className="w-full text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  data-testid="back-to-login-button"
                >
                  Back to Login
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}