<?php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class AuthController {
    private $db;
    private $user;

    public function __construct($db) {
        $this->db = $db;
        $this->user = new User($db);
    }

    public function register($data) {
        $errors = [];
        
        // Валидация
        if(!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email format';
        }
        
        if(!preg_match('/^[a-zA-Z]+$/', $data['name'])) {
            $errors['name'] = 'Name must contain only latin letters';
        }
        
        if(strlen($data['password']) < 8) {
            $errors['password'] = 'Password must be at least 8 characters';
        } elseif(!preg_match('/[0-9]/', $data['password']) || !preg_match('/[^a-zA-Z0-9]/', $data['password'])) {
            $errors['password'] = 'Password must contain numbers and special characters';
        }
        
        if(!empty($errors)) {
            http_response_code(400);
            echo json_encode(['errors' => $errors]);
            return;
        }
        
        // Проверка существования пользователя
        $existingUser = $this->user->getByEmail($data['email']);
        if($existingUser) {
            http_response_code(400);
            echo json_encode(['errors' => ['email' => 'Email already exists']]);
            return;
        }
        
        $this->user->email = $data['email'];
        $this->user->name = $data['name'];
        $this->user->password = $data['password'];
        
        if($this->user->create()) {
            http_response_code(201);
            echo json_encode(['message' => 'User created successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Unable to create user']);
        }
    }

    public function login($data) {
        $errors = [];
        
        if(empty($data['email'])) {
            $errors['email'] = 'Email is required';
        }
        
        if(empty($data['password'])) {
            $errors['password'] = 'Password is required';
        }
        
        if(!empty($errors)) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['errors' => $errors]);
            return;
        }
        
        $this->user->email = $data['email'];
        $this->user->password = $data['password'];
        
        if($this->user->login()) {
            $token = AuthMiddleware::generateToken($this->user->id, $this->user->email);
            
            header('Content-Type: application/json');
            echo json_encode([
                'token' => $token,
                'user' => [
                    'id' => $this->user->id,
                    'email' => $this->user->email,
                    'name' => $this->user->name
                ]
            ]);
        } else {
            http_response_code(401);
            header('Content-Type: application/json');
            // Более конкретная ошибка
            echo json_encode(['errors' => ['password' => 'Неверный email или пароль']]);
        }
    }
}
?>