import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { UserPlus, Mail, Lock, User } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/auth/register`, formData);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-full mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
              Create Account
            </h2>
            <p className="text-slate-600 mt-2">Register as a student or teacher</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-slate-700 mb-1.5 block">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="pl-10 h-11 rounded-md border-slate-200 bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                  data-testid="register-name-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium text-slate-700 mb-1.5 block">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@university.edu"
                  className="pl-10 h-11 rounded-md border-slate-200 bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                  data-testid="register-email-input"
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
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="pl-10 h-11 rounded-md border-slate-200 bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                  data-testid="register-password-input"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-3 block">
                Register As
              </Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                  <RadioGroupItem value="student" id="student" data-testid="role-student-radio" />
                  <Label htmlFor="student" className="cursor-pointer flex-1">
                    <div className="font-medium text-slate-900">Student</div>
                    <div className="text-sm text-slate-600">Submit resumes and receive feedback</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                  <RadioGroupItem value="teacher" id="teacher" data-testid="role-teacher-radio" />
                  <Label htmlFor="teacher" className="cursor-pointer flex-1">
                    <div className="font-medium text-slate-900">Teacher</div>
                    <div className="text-sm text-slate-600">Review resumes and provide feedback</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              type="submit"
              className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-md px-6 py-2 h-11 font-medium active:scale-95 transition-all"
              disabled={loading}
              data-testid="register-submit-button"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600 text-sm">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-slate-900 font-medium hover:underline"
                data-testid="go-to-login-button"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}