const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const DATA_FILE = path.join(__dirname, 'leads.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize users if not exists
function initializeUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = [
      { id: 1, username: 'gradrtech.co.uk', password: 'gradrtech@12', created_at: new Date().toISOString() },
      { id: 2, username: 'gradrtech12', password: 'gradrtech12', created_at: new Date().toISOString() }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), 'utf8');
  }
}

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) { return []; }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="GradrTech Admin"');
    return res.status(401).send('Authentication required');
  }

  const encoded = authHeader.split(' ')[1];
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const [username, password] = decoded.split(':');

  const users = readUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    req.user = user;
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="GradrTech Admin"');
  return res.status(401).send('Invalid credentials');
}

function readLeads() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) { return []; }
}

function writeLeads(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
}

app.post('/api/leads', (req, res) => {
  const lead = req.body;
  
  // Validate required fields
  if (!lead || !lead.email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  if (!lead.name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(lead.email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const leads = readLeads();
  lead.id = Date.now();
  lead.received_at = new Date().toISOString();
  leads.push(lead);
  
  try {
    writeLeads(leads);
    console.log(`New lead received: ${lead.name} (${lead.email})`);
    return res.status(201).json({ ok: true, id: lead.id });
  } catch (err) {
    console.error('Failed to write leads:', err);
    return res.status(500).json({ error: 'failed to save' });
  }
});

// Serve admin.html without auth (client-side JS handles auth)
app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

app.get('/api/stats', requireAdmin, (req, res) => {
  try {
    const leads = readLeads();
    const stats = {
      total_leads: leads.length,
      leads_with_phone: leads.filter(l => l.phone && l.phone.length > 0).length,
      leads_with_company: leads.filter(l => l.company && l.company.length > 0).length,
      industries: {},
      recent_leads: leads.slice(-10).map(l => ({
        id: l.id,
        name: l.name,
        email: l.email,
        company: l.company,
        industry: l.industry,
        received_at: l.received_at
      }))
    };
    
    // Count by industry
    leads.forEach(lead => {
      const ind = lead.industry || 'not-specified';
      stats.industries[ind] = (stats.industries[ind] || 0) + 1;
    });
    
    res.json(stats);
  } catch (err) {
    console.error('Failed to get stats:', err);
    res.status(500).json({ error: 'failed to get stats' });
  }
});

app.get('/api/leads/:id', requireAdmin, (req, res) => {
  try {
    const leads = readLeads();
    const leadId = parseInt(req.params.id, 10);
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json(lead);
  } catch (err) {
    console.error('Failed to retrieve lead:', err);
    res.status(500).json({ error: 'failed to retrieve lead' });
  }
});

app.get('/api/leads', requireAdmin, (req, res) => {
  try {
    const leads = readLeads();
    // Return full lead data including names and requirements
    res.json(leads);
  } catch (err) {
    console.error('Failed to read leads:', err);
    res.status(500).json({ error: 'failed to read leads' });
  }
});

app.get('/api/leads-export/csv', requireAdmin, (req, res) => {
  try {
    const leads = readLeads();
    
    if (leads.length === 0) {
      return res.status(204).send('No leads to export');
    }
    
    // CSV Header
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Company', 'Industry', 'Message', 'Received At'];
    const csvRows = [headers.join(',')];
    
    // CSV Rows
    leads.forEach(lead => {
      const row = [
        lead.id,
        `"${(lead.name || '').replace(/"/g, '""')}"`,
        lead.email,
        lead.phone || '',
        `"${(lead.company || '').replace(/"/g, '""')}"`,
        lead.industry || '',
        `"${(lead.message || '').replace(/"/g, '""').substring(0, 100)}"`,
        lead.received_at || ''
      ];
      csvRows.push(row.join(','));
    });
    
    const csv = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Failed to export leads:', err);
    res.status(500).json({ error: 'failed to export leads' });
  }
});

// Initialize users on startup
initializeUsers();

// User management endpoints
app.get('/api/users', requireAdmin, (req, res) => {
  try {
    const users = readUsers();
    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      created_at: u.created_at
    })));
  } catch (err) {
    console.error('Failed to get users:', err);
    res.status(500).json({ error: 'failed to get users' });
  }
});

app.get('/api/me', requireAdmin, (req, res) => {
  try {
    res.json({
      id: req.user.id,
      username: req.user.username,
      created_at: req.user.created_at
    });
  } catch (err) {
    console.error('Failed to get profile:', err);
    res.status(500).json({ error: 'failed to get profile' });
  }
});

app.post('/api/change-password', requireAdmin, (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    
    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old and new password required' });
    }
    
    if (req.user.password !== old_password) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const users = readUsers();
    const userIdx = users.findIndex(u => u.id === req.user.id);
    
    if (userIdx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    users[userIdx].password = new_password;
    writeUsers(users);
    
    console.log(`Password changed for user: ${req.user.username}`);
    res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Failed to change password:', err);
    res.status(500).json({ error: 'failed to change password' });
  }
});

app.post('/api/change-username', requireAdmin, (req, res) => {
  try {
    const { new_username, password } = req.body;
    
    if (!new_username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (req.user.password !== password) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }
    
    const users = readUsers();
    const userExists = users.find(u => u.username === new_username);
    
    if (userExists && userExists.id !== req.user.id) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    
    const userIdx = users.findIndex(u => u.id === req.user.id);
    const oldUsername = users[userIdx].username;
    users[userIdx].username = new_username;
    writeUsers(users);
    
    console.log(`Username changed from ${oldUsername} to ${new_username}`);
    res.json({ ok: true, message: 'Username changed successfully', new_username });
  } catch (err) {
    console.error('Failed to change username:', err);
    res.status(500).json({ error: 'failed to change username' });
  }
});

app.post('/api/add-user', requireAdmin, (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const users = readUsers();
    const userExists = users.find(u => u.username === username);
    
    if (userExists) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    const newUser = {
      id: Math.max(...users.map(u => u.id), 0) + 1,
      username,
      password,
      created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    writeUsers(users);
    
    console.log(`New user created: ${username}`);
    res.status(201).json({ ok: true, user: { id: newUser.id, username, created_at: newUser.created_at } });
  } catch (err) {
    console.error('Failed to add user:', err);
    res.status(500).json({ error: 'failed to add user' });
  }
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const users = readUsers();
    const userIdx = users.findIndex(u => u.id === userId);
    
    if (userIdx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const deletedUsername = users[userIdx].username;
    users.splice(userIdx, 1);
    writeUsers(users);
    
    console.log(`User deleted: ${deletedUsername}`);
    res.json({ ok: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Failed to delete user:', err);
    res.status(500).json({ error: 'failed to delete user' });
  }
});

app.listen(PORT, () => console.log(`Leads server listening on http://localhost:${PORT}`));

