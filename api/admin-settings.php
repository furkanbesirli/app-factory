<?php
/**
 * Admin Settings API Endpoint
 * 
 * Bu dosyayı sunucunuzda şu konuma koyun:
 * https://uhmingle.com/api/admin-settings.php
 * 
 * Veya .htaccess ile şu şekilde yönlendirin:
 * https://uhmingle.com/api/admin-settings -> admin-settings.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS request için CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// JSON dosyası yolu
$jsonFile = __DIR__ . '/admin-settings.json';

// GET request - Ayarları oku
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($jsonFile)) {
        $content = file_get_contents($jsonFile);
        echo $content;
    } else {
        // Dosya yoksa varsayılan ayarları döndür
        $defaultSettings = [
            'googleSignInEnabled' => true,
            'googleSignInCountries' => ['US'],
            'botsApiUrl' => 'https://uhmingle.com/data/bots.json'
        ];
        echo json_encode($defaultSettings, JSON_PRETTY_PRINT);
    }
    exit;
}

// POST request - Ayarları güncelle
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !isset($data['settings'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid request data']);
        exit;
    }
    
    // Admin şifre kontrolü (güvenlik için)
    // NOT: Production'da daha güvenli bir authentication kullanın!
    $adminPassword = $data['adminPassword'] ?? '';
    $expectedPassword = 'uhminglepanel**'; // adminService.ts'deki şifre ile aynı olmalı
    
    if ($adminPassword !== $expectedPassword) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized - Invalid admin password']);
        exit;
    }
    
    // Ayarları al
    $settings = $data['settings'];
    
    // Validasyon
    if (!isset($settings['googleSignInEnabled']) || 
        !isset($settings['googleSignInCountries']) || 
        !isset($settings['botsApiUrl'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid settings format']);
        exit;
    }
    
    // JSON dosyasına yaz
    $jsonContent = json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    
    if (file_put_contents($jsonFile, $jsonContent) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write settings file']);
        exit;
    }
    
    // Başarılı
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Settings updated successfully',
        'settings' => $settings
    ]);
    exit;
}

// Diğer method'lar için 405
http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);

