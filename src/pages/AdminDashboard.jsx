import React, { useState, useEffect } from 'react';
import { getAdminDashboard, getAdminUsers, makeUserAdmin, removeUserAdmin } from '../api';
import { 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Collapse,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';

// Helper function to get EI/CI level color
const getLevelColor = (level) => {
  if (level >= 8) return '#4caf50'; // Green
  if (level >= 4) return '#ff9800'; // Orange
  return '#f44336'; // Red
};

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

// EI/CI Level Badge Component
const LevelBadge = ({ level, label }) => (
  <Chip
    label={`${label}: ${level}/10`}
    size="small"
    sx={{
      bgcolor: getLevelColor(level),
      color: 'white',
      fontWeight: 'bold',
      mr: 0.5
    }}
  />
);

// Expandable Chat Row Component
const ChatRow = ({ chat, type }) => {
  const [expanded, setExpanded] = useState(false);
  const messages = chat.messages || [];

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            disabled={messages.length === 0}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          {type === 'user' ? chat.user_email : (chat.participant_email || 'No email')}
        </TableCell>
        <TableCell>{chat.character_name}</TableCell>
        <TableCell>
          <LevelBadge level={chat.character_ei_level} label="EI" />
          <LevelBadge level={chat.character_ci_level} label="CI" />
        </TableCell>
        <TableCell>
          {type === 'user' ? chat.message_count : chat.interactions}
        </TableCell>
        <TableCell>{formatDate(type === 'user' ? chat.last_message_at : chat.last_message_at)}</TableCell>
        <TableCell>
          <Chip
            label={chat.survey_unlocked ? 'Unlocked' : 'Locked'}
            color={chat.survey_unlocked ? 'success' : 'default'}
            size="small"
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, borderBottom: expanded ? 1 : 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="subtitle2" gutterBottom>
                Chat History ({messages.length} messages)
              </Typography>
              {messages.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No messages yet
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {messages.map((msg, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        mb: 1,
                        p: 1,
                        bgcolor: (msg.sender === 'user' || msg.sender === 'participant') ? '#e3f2fd' : '#fff3e0',
                        borderRadius: 1,
                        borderLeft: 3,
                        borderColor: (msg.sender === 'user' || msg.sender === 'participant') ? '#2196f3' : '#ff9800'
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        <strong>{msg.sender === 'user' || msg.sender === 'participant' ? 'User' : 'Character'}</strong>
                        {' • '}
                        {formatDate(msg.created_at || msg.timestamp)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {msg.content || msg.message}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default function AdminDashboard({ user }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminError, setAdminError] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
    loadAdminUsers();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      const errorMessage = err.message || 'Failed to load dashboard';
      
      // Handle specific error cases
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setError('You do not have admin access.');
        setTimeout(() => {
          window.location.href = '/chat';
        }, 2000);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      const data = await getAdminUsers();
      setAdminUsers(Array.isArray(data) ? data : (data.admins || []));
    } catch (err) {
      console.error('Failed to load admin users:', err);
    }
  };

  const handleMakeAdmin = async () => {
    if (!newAdminEmail.trim()) {
      setAdminError('Please enter an email address');
      return;
    }

    try {
      setAdminLoading(true);
      setAdminError(null);
      
      // Find user ID by email (you may need to adjust this based on your API)
      // For now, assuming the API accepts email directly
      await makeUserAdmin(newAdminEmail);
      
      setAdminDialogOpen(false);
      setNewAdminEmail('');
      await loadAdminUsers();
      await loadDashboard();
    } catch (err) {
      const errorMessage = err.message || 'Failed to make user admin';
      if (errorMessage.includes('Maximum') || errorMessage.includes('2 admins')) {
        setAdminError('Maximum of 2 admins allowed');
      } else {
        setAdminError(errorMessage);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const handleRemoveAdmin = async (userId) => {
    if (adminUsers.length <= 1) {
      setAdminError('Cannot remove the last admin');
      return;
    }

    if (user && user.id === userId) {
      setAdminError('Cannot remove your own admin status');
      return;
    }

    try {
      setAdminLoading(true);
      setAdminError(null);
      await removeUserAdmin(userId);
      await loadAdminUsers();
      await loadDashboard();
    } catch (err) {
      const errorMessage = err.message || 'Failed to remove admin';
      if (errorMessage.includes('last admin')) {
        setAdminError('Cannot remove the last admin');
      } else if (errorMessage.includes('your own')) {
        setAdminError('Cannot remove your own admin status');
      } else {
        setAdminError(errorMessage);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadDashboard}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">No dashboard data available</Alert>
      </Box>
    );
  }

  const { total_users, total_participants, total_conversations, total_messages, user_chats, participant_chats, characters } = dashboardData;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            loadDashboard();
            loadAdminUsers();
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h4">
                {total_users || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Participants
              </Typography>
              <Typography variant="h4">
                {total_participants || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Conversations
              </Typography>
              <Typography variant="h4">
                {total_conversations || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Messages
              </Typography>
              <Typography variant="h4">
                {total_messages || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Admin Management Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Admin Users</Typography>
          <Button
            variant="contained"
            startIcon={<AdminPanelSettingsIcon />}
            onClick={() => setAdminDialogOpen(true)}
            disabled={adminUsers.length >= 2}
          >
            Make Admin
          </Button>
        </Box>
        {adminUsers.length >= 2 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Maximum of 2 admins allowed
          </Alert>
        )}
        {adminError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAdminError(null)}>
            {adminError}
          </Alert>
        )}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminUsers.map((admin) => (
                <TableRow key={admin.id || admin.email}>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<PersonRemoveIcon />}
                      onClick={() => handleRemoveAdmin(admin.id || admin.user_id)}
                      disabled={adminUsers.length <= 1 || (user && user.id === (admin.id || admin.user_id))}
                    >
                      Remove Admin
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Tabs for User Chats and Participant Chats */}
      <Paper>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label={`User Chats (${user_chats?.length || 0})`} />
          <Tab label={`Participant Chats (${participant_chats?.length || 0})`} />
          <Tab label={`Characters (${characters?.length || 0})`} />
        </Tabs>

        {/* User Chats Tab */}
        {tabValue === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="50px"></TableCell>
                  <TableCell><strong>User Email</strong></TableCell>
                  <TableCell><strong>Character</strong></TableCell>
                  <TableCell><strong>EI/CI Levels</strong></TableCell>
                  <TableCell><strong>Messages</strong></TableCell>
                  <TableCell><strong>Last Message</strong></TableCell>
                  <TableCell><strong>Survey Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!user_chats || user_chats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No user chats found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  user_chats.map((chat, idx) => (
                    <ChatRow key={idx} chat={chat} type="user" />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Participant Chats Tab */}
        {tabValue === 1 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="50px"></TableCell>
                  <TableCell><strong>Participant Email</strong></TableCell>
                  <TableCell><strong>Character</strong></TableCell>
                  <TableCell><strong>EI/CI Levels</strong></TableCell>
                  <TableCell><strong>Interactions</strong></TableCell>
                  <TableCell><strong>Last Message</strong></TableCell>
                  <TableCell><strong>Survey Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!participant_chats || participant_chats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No participant chats found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  participant_chats.map((chat, idx) => (
                    <ChatRow key={idx} chat={chat} type="participant" />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Characters Tab */}
        {tabValue === 2 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>EI Level</strong></TableCell>
                  <TableCell><strong>CI Level</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!characters || characters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No characters found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  characters.map((char) => (
                    <TableRow key={char.id}>
                      <TableCell>{char.name}</TableCell>
                      <TableCell>
                        <LevelBadge level={char.ei_level} label="EI" />
                      </TableCell>
                      <TableCell>
                        <LevelBadge level={char.ci_level} label="CI" />
                      </TableCell>
                      <TableCell>{char.description || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Make Admin Dialog */}
      <Dialog open={adminDialogOpen} onClose={() => setAdminDialogOpen(false)}>
        <DialogTitle>Make User Admin</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="User Email"
            type="email"
            fullWidth
            variant="outlined"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            sx={{ mt: 1 }}
          />
          {adminError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {adminError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAdminDialogOpen(false);
            setNewAdminEmail('');
            setAdminError(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleMakeAdmin} 
            variant="contained"
            disabled={adminLoading}
          >
            {adminLoading ? <CircularProgress size={20} /> : 'Make Admin'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
