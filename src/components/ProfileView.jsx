import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Calendar,
  Users,
  FileSpreadsheet,
  Layers,
  Crown,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  UserPlus,
  Trash2,
  X
} from 'lucide-react';

export default function ProfileView() {
  const { user, role, isAdmin, isAuthority, updateUser } = useAuth();

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Admin: All Users List & Management
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [userRoleMsg, setUserRoleMsg] = useState(null);

  // Admin: Add New User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Fetch all users for Admin
  const fetchAllUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const res = await api.get('/auth/users');
      setAllUsers(res.data?.users || []);
    } catch (err) {
      console.error('Failed to fetch users list:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers();
    }
  }, [isAdmin]);

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    setProfileError(null);

    try {
      const res = await api.put('/auth/profile', {
        name: name.trim(),
        email: email.trim(),
      });
      if (res.data?.user) {
        updateUser(res.data.user);
      }
      setProfileMsg(res.data?.message || 'Profile updated successfully!');
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile details.';
      setProfileError(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMsg(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      setPasswordSaving(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      setPasswordSaving(false);
      return;
    }

    try {
      const res = await api.put('/auth/change-password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setPasswordMsg(res.data?.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.password?.[0] || 'Failed to change password.';
      setPasswordError(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  // Admin: Change Role of a User
  const handleRoleChange = async (targetUserId, newRole) => {
    setUpdatingUserId(targetUserId);
    setUserRoleMsg(null);
    try {
      const res = await api.put(`/auth/users/${targetUserId}/role`, {
        role: newRole,
      });
      setUserRoleMsg(res.data?.message || 'Role updated!');
      // Update local state
      setAllUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
      );
      // If updating current user's role
      if (targetUserId === user.id) {
        updateUser({ ...user, role: newRole });
      }
      setTimeout(() => setUserRoleMsg(null), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Admin: Create New User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    setCreateUserError(null);

    if (newUserData.password.length < 6) {
      setCreateUserError('Password must be at least 6 characters long.');
      setCreatingUser(false);
      return;
    }

    try {
      const res = await api.post('/auth/users', {
        name: newUserData.name.trim(),
        email: newUserData.email.trim(),
        password: newUserData.password,
        role: newUserData.role,
      });

      setUserRoleMsg(res.data?.message || `User '${newUserData.name}' created successfully!`);
      setShowAddUserModal(false);
      setNewUserData({ name: '', email: '', password: '', role: 'user' });
      fetchAllUsers();
      setTimeout(() => setUserRoleMsg(null), 5000);
    } catch (err) {
      const msg = err.response?.data?.message || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(', ') : 'Failed to create user account.');
      setCreateUserError(msg);
    } finally {
      setCreatingUser(false);
    }
  };

  // Admin: Delete User
  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === user.id) {
      alert('You cannot delete your own logged-in admin account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete user "${targetUser.name}" (${targetUser.email})?`)) {
      return;
    }

    setDeletingUserId(targetUser.id);
    try {
      const res = await api.delete(`/auth/users/${targetUser.id}`);
      setUserRoleMsg(res.data?.message || 'User deleted successfully.');
      setAllUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setTimeout(() => setUserRoleMsg(null), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const getRoleBadgeStyle = (r) => {
    switch (r) {
      case 'admin':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'authority':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">
      
      {/* 1. Header Banner & Profile Overview */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-indigo-950/20">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 relative z-10">
          
          {/* Avatar */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-3xl font-extrabold shadow-2xl border ${
              isAdmin
                ? 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white border-amber-400/40 shadow-amber-500/20'
                : isAuthority
                ? 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white border-blue-400/40 shadow-blue-500/20'
                : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-indigo-500/20'
            }`}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            {isAdmin && (
              <div className="absolute -bottom-2 -right-2 p-1.5 bg-amber-500 text-slate-950 rounded-xl shadow-lg border border-amber-300" title="Administrator">
                <Crown className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">{user?.name || 'User'}</h2>
              <span className={`inline-flex items-center space-x-1 px-3 py-0.5 rounded-full text-xs font-extrabold uppercase border tracking-wider self-center sm:self-auto ${getRoleBadgeStyle(role)}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{role} Role</span>
              </span>
            </div>
            
            <p className="text-sm text-slate-400 flex items-center justify-center sm:justify-start space-x-1.5">
              <Mail className="w-4 h-4 text-slate-500" />
              <span>{user?.email}</span>
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs text-slate-400">
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Member Since: {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Registered Member'}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Token Active & Verified</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Grid: Personal Info Form & Change Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Card A: Edit Personal Information */}
        <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-800 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Personal Information</h3>
                <p className="text-xs text-slate-400">Update your account display name and email address</p>
              </div>
            </div>

            {profileMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{profileMsg}</span>
              </div>
            )}

            {profileError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{profileError}</span>
              </div>
            )}

            <form id="profileForm" onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your name"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter email address"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Assigned System Role</label>
                <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 flex items-center justify-between">
                  <span className="capitalize font-semibold text-slate-200">{role}</span>
                  <span className="text-[10px] text-slate-500 italic">Managed by system admin</span>
                </div>
              </div>
            </form>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              form="profileForm"
              disabled={profileSaving}
              className="w-full py-2.5 gradient-bg hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </div>

        {/* Card B: Security & Password Update */}
        <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-800 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Security & Password</h3>
                <p className="text-xs text-slate-400">Ensure your account is protected with a secure password</p>
              </div>
            </div>

            {passwordMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{passwordMsg}</span>
              </div>
            )}

            {passwordError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{passwordError}</span>
              </div>
            )}

            <form id="passwordForm" onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Current Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="At least 8 characters"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              form="passwordForm"
              disabled={passwordSaving || !currentPassword || !newPassword}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              <span>{passwordSaving ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. Role Privileges & Capabilities Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-800 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Active Role & Permissions Breakdown</h3>
            <p className="text-xs text-slate-400">Current authorization level and data governance status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          <div className={`p-4 rounded-2xl border transition ${
            isAdmin
              ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-lg shadow-amber-500/5'
              : 'bg-slate-900/40 border-slate-800 opacity-60 text-slate-400'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase text-amber-300">Admin</span>
              {isAdmin && <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-extrabold">Active</span>}
            </div>
            <p className="text-xs font-semibold mb-2 text-slate-200">Full System Governance</p>
            <ul className="text-[11px] space-y-1.5 text-slate-300">
              <li>✓ View all files uploaded by any user</li>
              <li>✓ Delete, restore, and force-purge records</li>
              <li>✓ Global customer search & audit exports</li>
              <li>✓ System-wide user directory & role management</li>
            </ul>
          </div>

          <div className={`p-4 rounded-2xl border transition ${
            isAuthority
              ? 'bg-blue-500/10 border-blue-500/40 text-white shadow-lg shadow-blue-500/5'
              : 'bg-slate-900/40 border-slate-800 opacity-60 text-slate-400'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase text-blue-300">Authority</span>
              {isAuthority && <span className="text-[10px] bg-blue-400 text-slate-950 px-2 py-0.5 rounded-full font-extrabold">Active</span>}
            </div>
            <p className="text-xs font-semibold mb-2 text-slate-200">Management Level Access</p>
            <ul className="text-[11px] space-y-1.5 text-slate-300">
              <li>✓ Personal Excel file processing & cleaning</li>
              <li>✓ Monthly collection logs & target reports</li>
              <li>✓ Customer ID fast editor & verification</li>
              <li>✓ Ready for custom authority modules</li>
            </ul>
          </div>

          <div className={`p-4 rounded-2xl border transition ${
            role === 'user'
              ? 'bg-indigo-500/10 border-indigo-500/40 text-white shadow-lg shadow-indigo-500/5'
              : 'bg-slate-900/40 border-slate-800 opacity-60 text-slate-400'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase text-indigo-300">User</span>
              {role === 'user' && <span className="text-[10px] bg-indigo-400 text-slate-950 px-2 py-0.5 rounded-full font-extrabold">Active</span>}
            </div>
            <p className="text-xs font-semibold mb-2 text-slate-200">Personal Workspace</p>
            <ul className="text-[11px] space-y-1.5 text-slate-300">
              <li>✓ Private upload history & data isolation</li>
              <li>✓ Excel file formatting & instant download</li>
              <li>✓ Personal monthly billing targets & comparison</li>
              <li>✓ Secure account password & profile management</li>
            </ul>
          </div>

        </div>
      </div>

      {/* 4. Admin Exclusive Section: System Users & Role Manager */}
      {isAdmin && (
        <div className="glass-card rounded-3xl p-6 sm:p-7 border border-amber-500/30 space-y-5 bg-gradient-to-b from-slate-900 via-slate-900/80 to-amber-950/10">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>System User Directory & Role Assignment</span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                    Admin Exclusive
                  </span>
                </h3>
                <p className="text-xs text-slate-400">View registered users and instantly promote or assign user roles</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(true);
                  setCreateUserError(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add New User</span>
              </button>

              <button
                type="button"
                onClick={fetchAllUsers}
                disabled={loadingUsers}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {userRoleMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{userRoleMsg}</span>
            </div>
          )}

          {loadingUsers && allUsers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400 mb-2" />
              Loading system users...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Files Processed</th>
                    <th className="py-3 px-4">Registered Date</th>
                    <th className="py-3 px-4">Current Role</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {allUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span>{u.name}</span>
                          {u.id === user.id && (
                            <span className="ml-2 text-[10px] text-indigo-400 font-normal">(You)</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">{u.email}</td>

                      <td className="py-3 px-4 text-slate-300 font-semibold">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                          <FileSpreadsheet className="w-3 h-3 text-indigo-400" />
                          <span>{u.processed_files_count || 0} files</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getRoleBadgeStyle(u.role)}`}>
                          {u.role || 'user'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <select
                            value={u.role || 'user'}
                            disabled={updatingUserId === u.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="user">User</option>
                            <option value="authority">Authority</option>
                            <option value="admin">Admin</option>
                          </select>

                          {u.id !== user.id && (
                            <button
                              type="button"
                              disabled={deletingUserId === u.id}
                              onClick={() => handleDeleteUser(u)}
                              title={`Remove ${u.name}`}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 hover:text-rose-300 transition cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* 5. Admin Modal: Add New User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md rounded-3xl p-6 sm:p-7 border border-amber-500/40 shadow-2xl relative bg-slate-900">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New User</h3>
                  <p className="text-xs text-slate-400">Add a new authorized account to the workspace</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createUserError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createUserError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                    placeholder="e.g. Rafiqul Islam"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="user@cclcatv.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Initial Password (min 6 characters)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Role Permission</label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer transition"
                  >
                    <option value="user">User (Standard Workspace Access)</option>
                    <option value="authority">Authority (Management Access)</option>
                    <option value="admin">Admin (Full Administrative Access)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/25 transition cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {creatingUser ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating User...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
