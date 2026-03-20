<?php
// Простой WebSocket сервер без зависимостей
// Запуск: php api/websocket/simple-server.php

$host = 'localhost';
$port = 8081;

$clients = [];
$boardSubscriptions = []; // Массив для хранения подписок на доски: [board_id => [client_id => connection]]

// Создаем сокет
$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1);
socket_bind($socket, $host, $port);
socket_listen($socket);

echo "============================================\n";
echo "WebSocket сервер запущен на {$host}:{$port}\n";
echo "Для остановки нажмите Ctrl+C\n";
echo "============================================\n";

while(true) {
    $read = array_merge([$socket], $clients);
    $write = null;
    $except = null;
    
    if(socket_select($read, $write, $except, null) > 0) {
        // Новое подключение
        if(in_array($socket, $read)) {
            $newClient = socket_accept($socket);
            $clients[] = $newClient;
            
            $header = socket_read($newClient, 1024);
            handshake($newClient, $header);
            
            echo "✅ Новый клиент подключился. Всего клиентов: " . count($clients) . "\n";
            
            $key = array_search($socket, $read);
            unset($read[$key]);
        }
        
        // Обработка сообщений от клиентов
        foreach($read as $client) {
            $data = socket_read($client, 1024);
            
            if($data === false || $data === '') {
                // Клиент отключился
                $key = array_search($client, $clients);
                unset($clients[$key]);
                
                // Удаляем из подписок
                foreach($boardSubscriptions as $boardId => $subscribers) {
                    if(isset($subscribers[$key])) {
                        unset($boardSubscriptions[$boardId][$key]);
                        echo "📢 Клиент отписался от доски {$boardId}\n";
                    }
                }
                
                echo "❌ Клиент отключился. Осталось клиентов: " . count($clients) . "\n";
                continue;
            }
            
            // Декодируем сообщение
            $message = decode($data);
            $data = json_decode($message, true);
            
            if($data) {
                // Выводим информацию о полученном сообщении
                echo "📨 Получено сообщение типа: {$data['type']}\n";
                
                switch($data['type']) {
                    case 'subscribe':
                        // Подписка на доску
                        $boardId = $data['board_id'];
                        $clientId = array_search($client, $clients);
                        
                        if(!isset($boardSubscriptions[$boardId])) {
                            $boardSubscriptions[$boardId] = [];
                        }
                        
                        $boardSubscriptions[$boardId][$clientId] = $client;
                        echo "📢 Клиент {$clientId} подписался на доску {$boardId}\n";
                        break;
                        
                    case 'unsubscribe':
                        // Отписка от доски
                        $boardId = $data['board_id'];
                        $clientId = array_search($client, $clients);
                        
                        if(isset($boardSubscriptions[$boardId][$clientId])) {
                            unset($boardSubscriptions[$boardId][$clientId]);
                            echo "📢 Клиент {$clientId} отписался от доски {$boardId}\n";
                        }
                        break;
                        
                    case 'object_update':
                        // Обновление объекта
                        $boardId = $data['board_id'];
                        $object = $data['object'];
                        
                        echo "🔄 Обновление объекта ID: {$object['id']} на доске {$boardId}\n";
                        
                        // Рассылаем всем подписанным на доску, кроме отправителя
                        if(isset($boardSubscriptions[$boardId])) {
                            $senderId = array_search($client, $clients);
                            
                            foreach($boardSubscriptions[$boardId] as $subscriberId => $subscriber) {
                                if($subscriberId !== $senderId) {
                                    send($subscriber, json_encode([
                                        'type' => 'object_updated',
                                        'object' => $object
                                    ]));
                                }
                            }
                        }
                        break;
                        
                    case 'focus_object':
                        // Фокус на объекте
                        $boardId = $data['board_id'];
                        $objectId = $data['object_id'];
                        $userId = $data['user_id'];
                        $userName = $data['user_name'] ?? 'Пользователь';
                        
                        echo "🎯 Пользователь {$userName} взял в фокус объект {$objectId} на доске {$boardId}\n";
                        
                        // Рассылаем всем подписанным на доску
                        if(isset($boardSubscriptions[$boardId])) {
                            $senderId = array_search($client, $clients);
                            
                            foreach($boardSubscriptions[$boardId] as $subscriberId => $subscriber) {
                                if($subscriberId !== $senderId) {
                                    send($subscriber, json_encode([
                                        'type' => 'object_focused',
                                        'object_id' => $objectId,
                                        'user_id' => $userId,
                                        'user_name' => $userName
                                    ]));
                                }
                            }
                        }
                        break;
                        
                    case 'release_focus':
                        // Снятие фокуса
                        $boardId = $data['board_id'];
                        $objectId = $data['object_id'];
                        
                        echo "🔓 Снят фокус с объекта {$objectId} на доске {$boardId}\n";
                        
                        // Рассылаем всем подписанным на доску
                        if(isset($boardSubscriptions[$boardId])) {
                            $senderId = array_search($client, $clients);
                            
                            foreach($boardSubscriptions[$boardId] as $subscriberId => $subscriber) {
                                if($subscriberId !== $senderId) {
                                    send($subscriber, json_encode([
                                        'type' => 'focus_released',
                                        'object_id' => $objectId
                                    ]));
                                }
                            }
                        }
                        break;
                        
                    default:
                        echo "⚠️ Неизвестный тип сообщения: {$data['type']}\n";
                        break;
                }
            }
        }
    }
}

// Закрываем сокет
socket_close($socket);

// Функция для рукопожатия WebSocket
function handshake($client, $headers) {
    if(preg_match("/Sec-WebSocket-Key: (.*)\r\n/", $headers, $match)) {
        $key = $match[1];
        $accept = base64_encode(pack('H*', sha1($key . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));
        
        $upgrade = "HTTP/1.1 101 Switching Protocols\r\n" .
                   "Upgrade: websocket\r\n" .
                   "Connection: Upgrade\r\n" .
                   "Sec-WebSocket-Accept: " . $accept . "\r\n\r\n";
        
        socket_write($client, $upgrade);
        echo "🤝 Рукопожатие выполнено\n";
    }
}

// Функция для декодирования сообщения WebSocket
function decode($data) {
    $length = ord($data[1]) & 127;
    
    if($length == 126) {
        $masks = substr($data, 4, 4);
        $data = substr($data, 8);
    } elseif($length == 127) {
        $masks = substr($data, 10, 4);
        $data = substr($data, 14);
    } else {
        $masks = substr($data, 2, 4);
        $data = substr($data, 6);
    }
    
    $text = '';
    for($i = 0; $i < strlen($data); $i++) {
        $text .= $data[$i] ^ $masks[$i % 4];
    }
    
    return $text;
}

// Функция для отправки сообщения WebSocket
function send($client, $data) {
    $frame = chr(129);
    $length = strlen($data);
    
    if($length <= 125) {
        $frame .= chr($length);
    } elseif($length <= 65535) {
        $frame .= chr(126) . pack('n', $length);
    } else {
        $frame .= chr(127) . pack('J', $length);
    }
    
    $frame .= $data;
    socket_write($client, $frame);
}
?>