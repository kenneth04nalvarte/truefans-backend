import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, CircularProgress, Alert, Button, TextField, Box, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [editData, setEditData] = useState({ name: '', email: '' });
  const [editMsg, setEditMsg] = useState(null);
  const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch user info');
        const data = await res.json();
        setUser(data.user || data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleEditOpen = () => {
    setEditData({ name: user.name || '', email: user.email || '' });
    setEditMsg(null);
    setEditOpen(true);
  };
  const handleEditClose = () => setEditOpen(false);
  const handleEditChange = e => setEditData({ ...editData, [e.target.name]: e.target.value });
  const handleEditSubmit = async e => {
    e.preventDefault();
    setEditMsg(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const data = await res.json();
      setUser(data.user || data);
      setEditMsg('Profile updated!');
    } catch (err) {
      setEditMsg(err.message);
    }
  };

  const handlePwOpen = () => {
    setPwData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPwMsg(null);
    setPwOpen(true);
  };
  const handlePwClose = () => setPwOpen(false);
  const handlePwChange = e => setPwData({ ...pwData, [e.target.name]: e.target.value });
  const handlePwSubmit = async e => {
    e.preventDefault();
    setPwMsg(null);
    if (pwData.newPassword !== pwData.confirmPassword) {
      setPwMsg("New passwords don't match");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: pwData.currentPassword,
          newPassword: pwData.newPassword,
        }),
      });
      if (!res.ok) throw new Error('Failed to change password');
      setPwMsg('Password changed!');
    } catch (err) {
      setPwMsg(err.message);
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', margin: '40px auto' }} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!user) return null;

  return (
    <Card sx={{ maxWidth: 400, margin: '40px auto', boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          User Profile
        </Typography>
        <Typography variant="body1"><b>Name:</b> {user.name || user.username || 'N/A'}</Typography>
        <Typography variant="body1"><b>Email:</b> {user.email || 'N/A'}</Typography>
        {user.role && <Typography variant="body1"><b>Role:</b> {user.role}</Typography>}
        {user.createdAt && <Typography variant="body1"><b>Joined:</b> {new Date(user.createdAt).toLocaleDateString()}</Typography>}
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={handleEditOpen}>Edit Profile</Button>
          <Button variant="outlined" onClick={handlePwOpen}>Change Password</Button>
        </Box>
      </CardContent>
      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onClose={handleEditClose}>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleEditSubmit} sx={{ mt: 1 }}>
            <TextField margin="normal" fullWidth label="Name" name="name" value={editData.name} onChange={handleEditChange} />
            <TextField margin="normal" fullWidth label="Email" name="email" value={editData.email} onChange={handleEditChange} />
            {editMsg && <Alert severity={editMsg === 'Profile updated!' ? 'success' : 'error'} sx={{ mt: 1 }}>{editMsg}</Alert>}
            <DialogActions>
              <Button onClick={handleEditClose}>Cancel</Button>
              <Button type="submit" variant="contained">Save</Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
      {/* Change Password Dialog */}
      <Dialog open={pwOpen} onClose={handlePwClose}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handlePwSubmit} sx={{ mt: 1 }}>
            <TextField margin="normal" fullWidth label="Current Password" name="currentPassword" type="password" value={pwData.currentPassword} onChange={handlePwChange} />
            <TextField margin="normal" fullWidth label="New Password" name="newPassword" type="password" value={pwData.newPassword} onChange={handlePwChange} />
            <TextField margin="normal" fullWidth label="Confirm New Password" name="confirmPassword" type="password" value={pwData.confirmPassword} onChange={handlePwChange} />
            {pwMsg && <Alert severity={pwMsg === 'Password changed!' ? 'success' : 'error'} sx={{ mt: 1 }}>{pwMsg}</Alert>}
            <DialogActions>
              <Button onClick={handlePwClose}>Cancel</Button>
              <Button type="submit" variant="contained">Change</Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UserProfile; 