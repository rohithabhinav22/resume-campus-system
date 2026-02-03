import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Shield, ArrowLeft, Lock, Key, Hash, Eye, EyeOff } from 'lucide-react';

export default function SecurityInspector() {
  const [securityData, setSecurityData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.role !== 'admin') {
      toast.error('Access denied. Admins only.');
      navigate('/login');
      return;
    }
    loadSecurityData();
  }, [navigate]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/security-audit`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSecurityData(response.data);
    } catch (error) {
      toast.error('Failed to load security data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !securityData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading security audit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
              Security Inspector
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <Lock className="w-8 h-8 text-emerald-600 mb-2" />
            <p className="text-2xl font-bold">{securityData.encrypted_resumes_count}</p>
            <p className="text-sm text-slate-600">Encrypted Resumes</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <Lock className="w-8 h-8 text-amber-600 mb-2" />
            <p className="text-2xl font-bold">{securityData.encrypted_feedbacks_count || 0}</p>
            <p className="text-sm text-slate-600">Encrypted Feedback</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <Hash className="w-8 h-8 text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{securityData.total_users}</p>
            <p className="text-sm text-slate-600">Password Hashes</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <Shield className="w-8 h-8 text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{securityData.total_signatures}</p>
            <p className="text-sm text-slate-600">Digital Signatures</p>
          </div>
        </div>

        {/* Encryption Key */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Encryption Key (AES-256)</h2>
            <button onClick={() => setShowKey(!showKey)}>
              {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <code className="text-sm font-mono bg-purple-50 p-3 rounded block break-all">
            {showKey ? securityData.encryption_key : '•'.repeat(40) + '...'}
          </code>
          <p className="text-xs text-slate-500 mt-2">256-bit key stored in environment variable</p>
        </div>

        {/* Password Hashes */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-xl font-bold mb-4">Password Hashes (bcrypt)</h2>
          <div className="space-y-3">
            {securityData.password_hashes.slice(0, 5).map((user) => (
              <div key={user.id} className="bg-slate-50 p-4 rounded border">
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-slate-600">{user.email}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{user.role}</span>
                </div>
                <code className="text-xs font-mono text-blue-700 block break-all">
                  {user.password}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* Encrypted Resumes */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-xl font-bold mb-4">Encrypted Resumes (AES-256-CBC)</h2>
          {securityData.encrypted_resumes.slice(0, 2).map((resume, idx) => (
            <div key={idx} className="border rounded-lg p-4 mb-4">
              <p className="font-medium mb-3">{resume.student_name}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-red-700 mb-2">🔒 Encrypted:</p>
                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    <code className="text-xs font-mono text-red-700 break-all line-clamp-3">
                      {resume.encrypted_text}
                    </code>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">IV: {resume.iv.substring(0, 20)}...</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-emerald-700 mb-2">🔓 Decrypted:</p>
                  <div className="bg-emerald-50 p-3 rounded border border-emerald-200">
                    <p className="text-sm text-slate-900 line-clamp-3 whitespace-pre-wrap">
                      {resume.decrypted_text}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">Hash: {resume.encrypted_hash.substring(0, 20)}...</p>
                </div>
              </div>

              <div className="mt-3 bg-blue-50 p-2 rounded text-xs">
                <strong>Signature:</strong> {resume.digital_signature} • 
                <strong className="ml-2">Verified:</strong> {resume.signature_verified ? '✓ Yes' : '✗ No'}
              </div>
            </div>
          ))}
        </div>

        {/* Encrypted Feedback */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-xl font-bold mb-4">Encrypted Feedback (AES-256-CBC)</h2>
          {securityData.feedback_signatures && securityData.feedback_signatures.length > 0 ? (
            securityData.feedback_signatures.slice(0, 2).map((feedback, idx) => (
              <div key={idx} className="border rounded-lg p-4 mb-4">
                <div className="flex justify-between mb-3">
                  <div>
                    <p className="font-medium">Teacher: {feedback.teacher_name}</p>
                    <p className="text-sm text-slate-600">For: {feedback.student_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs h-fit ${
                    feedback.signature_verified 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {feedback.signature_verified ? '✓ Verified' : '✗ Invalid'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-red-700 mb-2">🔒 Encrypted:</p>
                    <div className="bg-red-50 p-3 rounded border border-red-200">
                      <code className="text-xs font-mono text-red-700 break-all line-clamp-3">
                        {feedback.encrypted_text}
                      </code>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">IV: {feedback.iv.substring(0, 20)}...</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-emerald-700 mb-2">🔓 Decrypted:</p>
                    <div className="bg-emerald-50 p-3 rounded border border-emerald-200">
                      <p className="text-sm text-slate-900 line-clamp-3">
                        {feedback.decrypted_text}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Hash: {feedback.encrypted_hash.substring(0, 20)}...</p>
                  </div>
                </div>

                <div className="mt-3 bg-amber-50 p-2 rounded text-xs">
                  <strong>HMAC-SHA256 Signature:</strong> {feedback.digital_signature}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-600">
              <p>No feedback submitted yet</p>
              <p className="text-sm text-slate-400 mt-1">Teachers need to provide feedback to see encryption</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-slate-900 text-white rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Security Features Implemented</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <ul className="space-y-1">
              <li>✓ AES-256-CBC Encryption</li>
              <li>✓ bcrypt Password Hashing</li>
              <li>✓ HMAC-SHA256 Signatures</li>
              <li>✓ Base64 Encoding</li>
            </ul>
            <ul className="space-y-1">
              <li>✓ JWT Authentication</li>
              <li>✓ Role-Based Access Control</li>
              <li>✓ Multi-Factor Auth (OTP)</li>
              <li>✓ Unique Salt per Password</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}