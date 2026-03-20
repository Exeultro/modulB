<?php
require_once __DIR__ . '/../models/Board.php';
require_once __DIR__ . '/../models/BoardObject.php';
require_once __DIR__ . '/../models/Like.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class BoardController {
    private $db;
    private $board;
    private $boardObject;
    private $like;

    public function __construct($db) {
        $this->db = $db;
        $this->board = new Board($db);
        $this->boardObject = new BoardObject($db);
        $this->like = new Like($db);
    }

    public function create($data) {
        try {
            $user = AuthMiddleware::authenticate();
            
            if(empty($data['name'])) {
                http_response_code(400);
                echo json_encode(['errors' => ['name' => 'Board name is required']]);
                return;
            }
            
            $this->board->name = $data['name'];
            $this->board->owner_id = $user['user_id'];
            $this->board->is_public = isset($data['is_public']) ? (bool)$data['is_public'] : false;
            
            if($this->board->create()) {
                echo json_encode([
                    'id' => $this->board->id,
                    'name' => $this->board->name,
                    'public_hash' => $this->board->public_hash,
                    'message' => 'Board created successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Unable to create board']);
            }
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function getUserBoards() {
        try {
            $user = AuthMiddleware::authenticate();
            $boards = $this->board->getUserBoards($user['user_id']);
            echo json_encode($boards);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function getPublicBoards() {
        try {
            $boards = $this->board->getPublicBoards();
            echo json_encode($boards);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function getBoard($hash) {
        try {
            $board = $this->board->getByHash($hash);
            
            if(!$board) {
                http_response_code(404);
                echo json_encode(['error' => 'Board not found']);
                return;
            }
            
            $objects = $this->boardObject->getByBoard($board['id']);
            
            echo json_encode([
                'board' => $board,
                'objects' => $objects
            ]);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function getBoardByHash($hash) {
        try {
            header('Content-Type: application/json');
            error_log("Getting board by hash: " . $hash);
            
            $board = $this->board->getByHash($hash);
            
            if(!$board) {
                http_response_code(404);
                echo json_encode(['error' => 'Board not found']);
                return;
            }
            
            $objects = $this->boardObject->getByBoard($board['id']);
            
            echo json_encode([
                'board' => $board,
                'objects' => $objects
            ]);
        } catch(Exception $e) {
            error_log("Error in getBoardByHash: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function grantAccess($board_id, $data) {
        try {
            $user = AuthMiddleware::authenticate();
            
            if(empty($data['email'])) {
                http_response_code(400);
                echo json_encode(['errors' => ['email' => 'Email is required']]);
                return;
            }
            
            $userModel = new User($this->db);
            $targetUser = $userModel->getByEmail($data['email']);
            
            if(!$targetUser) {
                http_response_code(404);
                echo json_encode(['errors' => ['email' => 'User not found']]);
                return;
            }
            
            if($this->board->grantAccess($board_id, $targetUser['id'])) {
                echo json_encode(['message' => 'Access granted successfully']);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Unable to grant access']);
            }
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function toggleLike($board_id) {
        try {
            $user = AuthMiddleware::authenticate();
            $result = $this->like->toggle($board_id, $user['user_id']);
            echo json_encode($result);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
?>