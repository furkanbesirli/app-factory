/**
 * Admin Settings API Endpoint (Node.js/Express)
 * 
 * Bu dosyayı Express.js sunucunuzda kullanabilirsiniz.
 * 
 * Örnek kullanım:
 * const express = require('express');
 * const app = express();
 * app.use(express.json());
 * 
 * // Bu endpoint'i ekleyin
 * app.get('/api/admin-settings', ...);
 * app.post('/api/admin-settings', ...);
 */

const fs = require('fs');
const path = require('path');

const JSON_FILE = path.join(__DIR__, 'admin-settings.json');
const ADMIN_PASSWORD = 'uhminglepanel**'; // adminService.ts'deki şifre ile aynı olmalı

// GET endpoint - Ayarları oku
app.get('/api/admin-settings', (req, res) => {
  try {
    if (fs.existsSync(JSON_FILE)) {
      const content = fs.readFileSync(JSON_FILE, 'utf8');
      res.json(JSON.parse(content));
    } else {
      // Dosya yoksa varsayılan ayarları döndür
      const defaultSettings = {
        googleSignInEnabled: true,
        googleSignInCountries: ['US'],
        botsApiUrl: 'https://uhmingle.com/data/bots.json'
      };
      res.json(defaultSettings);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// POST endpoint - Ayarları güncelle
app.post('/api/admin-settings', (req, res) => {
  try {
    const { settings, adminPassword } = req.body;
    
    // Admin şifre kontrolü
    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized - Invalid admin password' });
    }
    
    // Validasyon
    if (!settings || 
        typeof settings.googleSignInEnabled !== 'boolean' ||
        !Array.isArray(settings.googleSignInCountries) ||
        typeof settings.botsApiUrl !== 'string') {
      return res.status(400).json({ error: 'Invalid settings format' });
    }
    
    // JSON dosyasına yaz
    fs.writeFileSync(JSON_FILE, JSON.stringify(settings, null, 2), 'utf8');
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: settings
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

