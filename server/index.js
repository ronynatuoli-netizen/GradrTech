const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = 'gradrtech.co.uk';
const ADMIN_PASSWORD = 'gradrtech@12';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const DATA_FILE = path.join(__dirname, 'leads.json');

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="GradrTech Admin"');
    return res.status(401).send('Authentication required');
  }

  const encoded = authHeader.split(' ')[1];
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const [username, password] = decoded.split(':');

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
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

app.get(['/admin', '/admin.html'], requireAdmin, (req, res) => {
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

app.listen(PORT, () => console.log(`Leads server listening on http://localhost:${PORT}`));
