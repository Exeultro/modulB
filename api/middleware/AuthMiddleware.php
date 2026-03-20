<?php
class AuthMiddleware {
    public static function validateToken($token) {
        try {
            $parts = explode('.', $token);
            if(count($parts) != 3) return false;
            
            $payload = json_decode(base64_decode($parts[1]), true);
            
            // Проверяем срок действия
            if($payload['exp'] < time()) return false;
            
            return $payload;
        } catch(Exception $e) {
            return false;
        }
    }

    public static function generateToken($user_id, $email) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'user_id' => $user_id,
            'email' => $email,
            'exp' => time() + (86400 * 7) // 7 дней
        ]);
        
        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, 'your_secret_key', true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }

    public static function authenticate() {
        $headers = getallheaders();
        
        if(!isset($headers['Authorization'])) {
            http_response_code(401);
            echo json_encode(['error' => 'No token provided']);
            exit;
        }
        
        $token = str_replace('Bearer ', '', $headers['Authorization']);
        $payload = self::validateToken($token);
        
        if(!$payload) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid token']);
            exit;
        }
        
        return $payload;
    }
}
?>