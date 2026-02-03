import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { FileText, LogOut, Lock, BadgeCheck, MessageSquare, User } from 'lucide-react';

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    loadTeachers();
    loadFeedbacks();
  }, []);

  const loadTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/student/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(response.data);
      if (response.data.length > 0) {
        setSelectedTeacher(response.data[0].id);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const loadFeedbacks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/student/feedback`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedbacks(response.data);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    }
  };

  const handleSubmitResume = async (e) => {
    e.preventDefault();
    if (!resumeText.trim()) {
      toast.error('Please enter your resume');
      return;
    }
    
    if (!selectedTeacher) {
      toast.error('Please select a teacher');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/student/resume`,
        { 
          resume_text: resumeText,
          teacher_id: selectedTeacher
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      setResumeText('');
      setTimeout(() => loadFeedbacks(), 1000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit resume');
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
              Student Dashboard
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submit Resume Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" data-testid="submit-resume-section">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Submit Resume
                </h2>
                <p className="text-slate-600 text-sm">Your resume will be encrypted with AES-256</p>
              </div>
            </div>

            <form onSubmit={handleSubmitResume} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Resume Content
                </label>
                <Textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Enter your resume details here...\n\nName: John Doe\nEducation: B.Tech Computer Science\nSkills: Python, JavaScript, React...\nExperience: ..."
                  className="min-h-[300px] rounded-md border-slate-200 bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                  data-testid="resume-textarea"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <Lock className="w-4 h-4 text-emerald-700" />
                <span className="text-sm text-emerald-700 font-medium">AES-256 Encrypted</span>
              </div>

              <Button
                type="submit"
                className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-md px-6 py-2 h-11 font-medium active:scale-95 transition-all"
                disabled={loading}
                data-testid="submit-resume-button"
              >
                {loading ? 'Submitting...' : 'Submit Resume'}
              </Button>
            </form>
          </div>

          {/* Feedback Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" data-testid="feedback-section">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-700 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Teacher Feedback
                </h2>
                <p className="text-slate-600 text-sm">{feedbacks.length} feedback(s) received</p>
              </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {feedbacks.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No feedback yet</p>
                  <p className="text-slate-400 text-sm mt-1">Submit a resume to receive feedback from teachers</p>
                </div>
              ) : (
                feedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                    data-testid="feedback-card"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-600" />
                        <span className="font-medium text-slate-900">{feedback.teacher_name}</span>
                      </div>
                      {feedback.signature_verified && (
                        <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-1 text-xs font-medium">
                          <BadgeCheck className="w-3 h-3" />
                          Verified
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-slate-600 mb-2">Resume Preview:</p>
                      <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 font-mono">
                        {feedback.resume_preview}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-2">Feedback:</p>
                      <p className="text-slate-900">{feedback.feedback_text}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500">
                        Digital Signature: <span className="font-mono">{feedback.digital_signature.substring(0, 16)}...</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(feedback.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}