<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Укажите правильный путь к database.php
require_once __DIR__ . '/api/config/database.php'; // или другой путь

$database = new Database();
$db = $database->getConnection();

$hash = $_GET['hash'] ?? '4bd5b245e9fb8454028f71500e8022f7';

try {
    $result = [
        'hash' => $hash,
        'database_connected' => $db ? true : false,
        'tables' => []
    ];
    
    // Проверяем существование таблиц
    $tables = ['boards', 'board_objects', 'users'];
    foreach ($tables as $table) {
        try {
            $stmt = $db->query("SELECT COUNT(*) as count FROM $table");
            $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            $result['tables'][$table] = [
                'exists' => true,
                'rows' => $count
            ];
        } catch (Exception $e) {
            $result['tables'][$table] = [
                'exists' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    // Ищем доску по хешу
    $query = "SELECT b.*, u.name as owner_name 
              FROM boards b
              LEFT JOIN users u ON b.owner_id = u.id
              WHERE b.public_hash = :hash";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':hash', $hash);
    $stmt->execute();
    
    $board = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$board) {
        $result['board'] = null;
        $result['message'] = 'Board not found';
    } else {
        $result['board'] = $board;
        
        // Получаем объекты доски
        $query = "SELECT * FROM board_objects WHERE board_id = :board_id ORDER BY created_at ASC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':board_id', $board['id']);
        $stmt->execute();
        
        $objects = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Декодируем content
        foreach ($objects as &$obj) {
            $obj['content'] = json_decode($obj['content'], true);
        }
        
        $result['objects'] = $objects;
        $result['objects_count'] = count($objects);
    }
    
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
?>