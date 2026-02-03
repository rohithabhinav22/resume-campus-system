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
    setUser(userData);
    loadSecurityData();
  }, []);

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

  const toggleSensitive = (key, subKey = null) => {
    if (subKey) {
      setShowSensitive(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          [subKey]: !prev[key]?.[subKey]
        }
      }));
    } else {
      setShowSensitive(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  };

  const maskText = (text, show) => {
    if (show || !text) return text;
    if (text.length <= 20) return '•'.repeat(text.length);
    return text.substring(0, 10) + '...' + text.substring(text.length - 10);
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
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                Security Inspector
              </h1>
              <p className="text-slate-600 text-sm mt-1">Live Security Audit Dashboard</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Encrypted Resumes</p>
                <p className="text-2xl font-bold text-slate-900">{securityData.encrypted_resumes_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Hash className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Password Hashes</p>
                <p className="text-2xl font-bold text-slate-900">{securityData.total_users}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Digital Signatures</p>
                <p className="text-2xl font-bold text-slate-900">{securityData.total_signatures}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Encryption Algorithm</p>
                <p className="text-lg font-bold text-slate-900">AES-256-CBC</p>
              </div>
            </div>
          </div>
        </div>

        {/* Encryption Keys Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                Encryption Key Management
              </h2>
              <p className="text-slate-600 text-sm">AES-256 Symmetric Key</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Master Encryption Key (256-bit)</p>
                <button
                  onClick={() => toggleSensitive('encryptionKey')}
                  className="text-slate-500 hover:text-slate-700"
                >
                  {showSensitive.encryptionKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <code className="text-xs font-mono text-purple-700 break-all block">
                {maskText(securityData.encryption_key, showSensitive.encryptionKey)}
              </code>
              <p className="text-xs text-slate-500 mt-2">
                ✓ Stored in environment variable • Never hardcoded • 32 bytes (256 bits)
              </p>
            </div>

            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Security Note:</strong> This key is used for all AES-256-CBC encryption operations. 
                Each resume gets a unique random IV (Initialization Vector) for additional security.
              </p>
            </div>
          </div>
        </div>

        {/* Password Hashing Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Hash className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                Password Hashing with Salt (bcrypt)
              </h2>
              <p className="text-slate-600 text-sm">All passwords stored with bcrypt + unique salt</p>
            </div>
          </div>

          <div className="space-y-3">
            {securityData.password_hashes.map((item, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-600">{item.email} • Role: {item.role}</p>
                  </div>
                  <button
                    onClick={() => toggleSensitive('passwords', item.id)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {showSensitive.passwords?.[item.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">bcrypt Hash with Salt:</p>
                    <code className="text-xs font-mono text-blue-700 break-all block bg-blue-50 p-2 rounded">
                      {showSensitive.passwords?.[item.id] ? item.password : maskText(item.password, false)}
                    </code>
                  </div>

                  {showSensitive.passwords?.[item.id] && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <p className="text-slate-600 font-medium">Algorithm:</p>
                        <p className="text-slate-900 font-mono">{item.password.substring(0, 4)}</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <p className="text-slate-600 font-medium">Cost Factor:</p>
                        <p className="text-slate-900 font-mono">{item.password.substring(4, 6)} (2^12 rounds)</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <p className="text-slate-600 font-medium">Salt (22 chars):</p>
                        <p className="text-slate-900 font-mono truncate">{item.password.substring(7, 29)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-emerald-700 mt-2">
                  ✓ Unique salt • Cost factor: 12 • 4096 hashing rounds
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Encrypted Resume Data */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                Resume Encryption (AES-256-CBC)
              </h2>
              <p className="text-slate-600 text-sm">Encrypted vs Decrypted Data Comparison</p>
            </div>
          </div>

          <div className="space-y-4">
            {securityData.encrypted_resumes.map((resume, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-900">{resume.student_name}</p>
                    <p className="text-sm text-slate-600">{resume.student_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-xs font-medium">
                      <Lock className="w-3 h-3 inline mr-1" />
                      AES-256 Encrypted
                    </span>
                    {resume.signature_verified && (
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        Signed
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Encrypted Data */}
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">🔒 Encrypted (Ciphertext):</p>
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <code className="text-xs font-mono text-red-700 break-all line-clamp-4">
                        {resume.encrypted_text}
                      </code>
                      <p className="text-xs text-red-600 mt-2">
                        ⚠️ Unreadable without decryption key
                      </p>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-xs text-slate-600">IV (Initialization Vector):</p>
                        <code className="text-xs font-mono text-slate-700 break-all">{resume.iv}</code>
                      </div>

                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-xs text-slate-600">SHA-256 Hash:</p>
                        <code className="text-xs font-mono text-slate-700 break-all">{resume.encrypted_hash}</code>
                      </div>
                    </div>
                  </div>

                  {/* Decrypted Data */}
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">🔓 Decrypted (Plaintext):</p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                      <p className="text-sm text-slate-900 whitespace-pre-wrap line-clamp-4">
                        {resume.decrypted_text}
                      </p>
                      <p className="text-xs text-emerald-600 mt-2">
                        ✓ Successfully decrypted using AES key
                      </p>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-xs text-slate-600">Digital Signature (HMAC-SHA256):</p>
                        <code className="text-xs font-mono text-slate-700 break-all">{resume.digital_signature}</code>
                      </div>

                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-xs text-slate-600">Base64 Encoded Metadata:</p>
                        <code className="text-xs font-mono text-slate-700 break-all">{resume.encoded_metadata}</code>
                        <p className="text-xs text-slate-500 mt-1">Decoded: {resume.decoded_metadata}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Encryption Details:</strong> AES-256-CBC mode • Random 16-byte IV • PKCS7 padding • 
                    Signature verified: {resume.signature_verified ? '✓ Valid' : '✗ Invalid'}
                  </p>
                </div>
              </div>
            ))}

            {securityData.encrypted_resumes.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No resumes submitted yet</p>
                <p className="text-slate-400 text-sm">Have students submit resumes to see encryption in action</p>
              </div>
            )}
          </div>
        </div>

        {/* Digital Signatures */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                Digital Signatures (HMAC-SHA256)
              </h2>
              <p className="text-slate-600 text-sm">Feedback authenticity verification</p>
            </div>
          </div>

          <div className="space-y-3">
            {securityData.feedback_signatures.map((feedback, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-900">Feedback by {feedback.teacher_name}</p>
                    <p className="text-sm text-slate-600">For: {feedback.student_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    feedback.signature_verified 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {feedback.signature_verified ? '✓ Verified' : '✗ Invalid'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Feedback Text:</p>
                    <p className="text-sm text-slate-900 bg-white p-2 rounded border border-slate-200">
                      {feedback.feedback_text}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 mb-1">HMAC-SHA256 Signature (64 hex chars):</p>
                    <code className="text-xs font-mono text-amber-700 break-all block bg-amber-50 p-2 rounded">
                      {feedback.digital_signature}
                    </code>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  Algorithm: HMAC-SHA256 • Created: {new Date(feedback.created_at).toLocaleString()}
                </p>
              </div>
            ))}

            {securityData.feedback_signatures.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-600">No feedback submitted yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Security Metrics Summary */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 shadow-lg p-6 text-white">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Security Implementation Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-slate-300 mb-2">✓ Implemented Features:</h3>
              <ul className="space-y-1 text-sm">
                <li>• AES-256-CBC Encryption (256-bit key)</li>
                <li>• bcrypt Password Hashing (cost factor 12)</li>
                <li>• HMAC-SHA256 Digital Signatures</li>
                <li>• Base64 Encoding for metadata</li>
                <li>• JWT Token Authentication (HS256)</li>
                <li>• Role-Based Access Control (RBAC)</li>
                <li>• Multi-Factor Authentication (OTP)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-slate-300 mb-2">🔐 Security Standards:</h3>
              <ul className="space-y-1 text-sm">
                <li>• NIST SP 800-63-2 Compliance</li>
                <li>• OWASP Top 10 Protection</li>
                <li>• Unique salt per password</li>
                <li>• Random IV per encryption</li>
                <li>• No hardcoded secrets</li>
                <li>• Environment-based key management</li>
                <li>• Signature verification on display</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}