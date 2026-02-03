import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { FileText, LogOut, Lock, BadgeCheck, Send, User } from 'lucide-react';

export default function TeacherDashboard() {
  const [user, setUser] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/teacher/resumes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResumes(response.data);
    } catch (error) {
      console.error('Error loading resumes:', error);
      toast.error('Failed to load resumes');
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      toast.error('Please enter feedback');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/teacher/feedback`,
        {
          resume_id: selectedResume.id,
          feedback_text: feedbackText
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Feedback submitted with digital signature!');
      setFeedbackText('');
      setSelectedResume(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
              Teacher Dashboard
            </h1>
            <p className="text-slate-600 text-sm mt-1">Welcome, {user?.name}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {!selectedResume ? (
          /* Resume List View */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" data-testid="resume-list-section">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Student Resumes
                </h2>
                <p className="text-slate-600 text-sm">{resumes.length} resume(s) available</p>
              </div>
            </div>

            <div className="space-y-4">
              {resumes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No resumes submitted yet</p>
                </div>
              ) : (
                resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedResume(resume)}
                    data-testid="resume-card"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-600" />
                        <div>
                          <span className="font-medium text-slate-900">{resume.student_name}</span>
                          <p className="text-sm text-slate-600">{resume.student_email}</p>
                          {resume.teacher_name && (
                            <p className="text-xs text-slate-500">Sent to: {resume.teacher_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2 py-1 text-xs font-medium font-mono">
                          <Lock className="w-3 h-3" />
                          Encrypted
                        </div>
                        {resume.signature_verified && (
                          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-1 text-xs font-medium">
                            <BadgeCheck className="w-3 h-3" />
                            Signed
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 line-clamp-2">{resume.resume_text}</p>

                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500">
                        Hash: <span className="font-mono">{resume.encrypted_hash.substring(0, 16)}...</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(resume.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Review & Feedback View */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resume View */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" data-testid="resume-view-section">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Resume Review
                    </h2>
                    <p className="text-slate-600 text-sm">{selectedResume.student_name}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedResume(null)}
                  className="text-slate-600 hover:text-slate-900"
                  data-testid="back-to-list-button"
                >
                  Back
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-1 text-xs font-medium font-mono">
                    <Lock className="w-3 h-3" />
                    AES-256 Encrypted
                  </div>
                  {selectedResume.signature_verified && (
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-xs font-medium">
                      <BadgeCheck className="w-3 h-3" />
                      Digitally Signed
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-2">Resume Content:</p>
                  <div className="text-slate-900 whitespace-pre-wrap">{selectedResume.resume_text}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Security Information:</p>
                  <p className="text-xs font-mono text-slate-700">
                    SHA-256: {selectedResume.encrypted_hash.substring(0, 32)}...
                  </p>
                  <p className="text-xs font-mono text-slate-700 mt-1">
                    Signature: {selectedResume.digital_signature}
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    Metadata: {selectedResume.encoded_metadata}
                  </p>
                </div>
              </div>
            </div>

            {/* Feedback Form */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" data-testid="feedback-form-section">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-amber-700 rounded-lg flex items-center justify-center">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Provide Feedback
                  </h2>
                  <p className="text-slate-600 text-sm">With digital signature</p>
                </div>
              </div>

              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Feedback for {selectedResume.student_name}
                  </label>
                  <Textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Enter your feedback here...\n\nStrengths:\n- ...\n\nAreas for improvement:\n- ...\n\nRecommendations:\n- ..."
                    className="min-h-[400px] rounded-md border-slate-200 bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    required
                    data-testid="feedback-textarea"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <BadgeCheck className="w-4 h-4 text-emerald-700" />
                  <span className="text-sm text-emerald-700 font-medium">Will be digitally signed</span>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-md px-6 py-2 h-11 font-medium active:scale-95 transition-all"
                  disabled={loading}
                  data-testid="submit-feedback-button"
                >
                  {loading ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}