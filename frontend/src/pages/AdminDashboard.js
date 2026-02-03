import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Shield, LogOut, Users, FileText, MessageSquare, Trash2, Edit, Plus, Eye, EyeOff } from 'lucide-react';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    loadStats();
    loadUsers();
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleDeleteUser = async (userId, userName, userRole) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}?`)) return;

    setDeleting(userId);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`${userName} deleted!`);
      
      // Immediately remove from UI
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      
      // Update stats immediately based on deleted user's role
      setStats(prevStats => ({
        ...prevStats,
        total_users: (prevStats.total_users || 1) - 1,
        total_students: userRole === 'student' ? (prevStats.total_students || 1) - 1 : prevStats.total_students,
        total_teachers: userRole === 'teacher' ? (prevStats.total_teachers || 1) - 1 : prevStats.total_teachers
      }));
      
      // Refresh from server for accuracy
      setTimeout(() => {
        loadStats();
        loadUsers();
      }, 100);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete user');
      // Reload on error
      loadUsers();
      loadStats();
    } finally {
      setDeleting(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@_\-!#$%^&*])[A-Za-z\d@_\-!#$%^&*]{8,}$/;
    
    if (!passwordRegex.test(formData.password)) {
      toast.error('Password must contain at least 8 characters including uppercase, lowercase, number, and special character (@, _, -, !, etc.)');
      return;
    }
    
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/admin/user`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User created successfully!');
      setShowCreateDialog(false);
      setFormData({ name: '', email: '', password: '', role: 'student' });
      loadUsers();
      loadStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    
    // Password validation (only if password is provided)
    if (formData.password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@_\-!#$%^&*])[A-Za-z\d@_\-!#$%^&*]{8,}$/;
      
      if (!passwordRegex.test(formData.password)) {
        toast.error('Password must contain at least 8 characters including uppercase, lowercase, number, and special character (@, _, -, !, etc.)');
        return;
      }
    }
    
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/admin/user/${editingUser.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User updated successfully!');
      setShowEditDialog(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'student' });
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role
    });
    setShowEditDialog(true);
  };

  const togglePasswordVisibility = (userId) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
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
              Admin Dashboard
            </h1>
            <p className="text-slate-600 text-sm mt-1">System Overview & Management</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/admin/security')}
              className="bg-purple-600 text-white hover:bg-purple-700"
              data-testid="security-inspector-button"
            >
              <Shield className="w-4 h-4 mr-2" />
              Security Inspector
            </Button>
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
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" data-testid="stats-users">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_users || 0}</p>
              </div>
              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" data-testid="stats-students">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Students</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_students || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" data-testid="stats-teachers">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Teachers</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_teachers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-amber-700 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" data-testid="stats-resumes">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Resumes</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_resumes || 0}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Security Info Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-emerald-700 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-emerald-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                Security Features Active
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm text-emerald-800">
                <div>✓ Multi-Factor Authentication (OTP)</div>
                <div>✓ AES-256 Resume Encryption</div>
                <div>✓ Bcrypt Password Hashing with Salt</div>
                <div>✓ Digital Signatures (SHA-256)</div>
                <div>✓ Role-Based Access Control</div>
                <div>✓ Base64 Metadata Encoding</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" data-testid="user-management-section">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                  User Management
                </h2>
                <p className="text-slate-600 text-sm">Manage all system users</p>
              </div>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  data-testid="create-user-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Create New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      data-testid="create-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="create-email-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      data-testid="create-password-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger data-testid="create-role-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} data-testid="create-user-submit">
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Password Hash</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Created</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid="user-row">
                    <td className="py-3 px-4 text-sm text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : u.role === 'teacher'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-slate-600">
                          {showPassword[u.id] ? u.password : u.password?.substring(0, 20) + '...'}
                        </code>
                        <button
                          onClick={() => togglePasswordVisibility(u.id)}
                          className="text-slate-500 hover:text-slate-700"
                          data-testid="toggle-password-button"
                        >
                          {showPassword[u.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(u)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          data-testid="edit-user-button"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {u.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(u.id, u.name);
                            }}
                            disabled={deleting === u.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`delete-user-${u.id}`}
                          >
                            {deleting === u.id ? (
                              <span className="text-xs">Deleting...</span>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Edit User Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Edit User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="edit-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="edit-email-input"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-password">New Password</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    required
                    data-testid="edit-password-input"
                  />
                  <p className="text-xs text-slate-500 mt-1">Enter new password to update</p>
                </div>
                <div>
                  <Label htmlFor="edit-role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger data-testid="edit-role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="edit-user-submit">
                  {loading ? 'Updating...' : 'Update User'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}