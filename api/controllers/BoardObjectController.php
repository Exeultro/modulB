<?php
require_once __DIR__ . '/../models/BoardObject.php';
require_once __DIR__ . '/../models/Board.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class BoardObjectController {
    private $db;
    private $object;
    private $board;

    public function __construct($db) {
        $this->db = $db;
        $this->object = new BoardObject($db);
        $this->board = new Board($db);
    }

    // GET /boards/{boardId}/objects
    public function getBoardObjects($boardId) {
        try {
            header('Content-Type: application/json');
            
            $boardData = $this->board->getById($boardId);
            if (!$boardData) {
                http_response_code(404);
                echo json_encode(['error' => 'Board not found']);
                return;
            }
            
            $objects = $this->object->getByBoard($boardId);
            echo json_encode(['objects' => $objects]);
        } catch(Exception $e) {
            error_log("getBoardObjects error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // POST /boards/{boardId}/objects
    public function createBoardObject($boardId, $data) {
        try {
            header('Content-Type: application/json');
            
            $user = AuthMiddleware::authenticate();
            
            $boardData = $this->board->getById($boardId);
            if (!$boardData) {
                http_response_code(404);
                echo json_encode(['error' => 'Board not found']);
                return;
            }
            
            if ($boardData['owner_id'] != $user['user_id'] && !$this->board->hasAccess($boardId, $user['user_id'])) {
                http_response_code(403);
                echo json_encode(['error' => 'Access denied']);
                return;
            }
            
            if (empty($data['type'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Object type is required']);
                return;
            }
            
            $objectId = $this->object->create([
                'board_id' => $boardId,
                'type' => $data['type'],
                'content' => $data['content'] ?? [],
                'position_x' => $data['position_x'] ?? 0,
                'position_y' => $data['position_y'] ?? 0,
                'width' => $data['width'] ?? null,
                'height' => $data['height'] ?? null,
                'rotation' => $data['rotation'] ?? 0
            ]);
            
            if ($objectId) {
                echo json_encode([
                    'success' => true,
                    'object' => [
                        'id' => $objectId,
                        'board_id' => $boardId,
                        'type' => $data['type'],
                        'content' => $data['content'] ?? [],
                        'position_x' => $data['position_x'] ?? 0,
                        'position_y' => $data['position_y'] ?? 0,
                        'width' => $data['width'] ?? null,
                        'height' => $data['height'] ?? null,
                        'rotation' => $data['rotation'] ?? 0
                    ]
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Unable to create object']);
            }
        } catch(Exception $e) {
            error_log("createBoardObject error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // PUT /boards/{boardId}/objects/{objectId}
    public function updateBoardObject($boardId, $objectId, $data) {
        try {
            header('Content-Type: application/json');
            
            $user = AuthMiddleware::authenticate();
            
            $boardData = $this->board->getById($boardId);
            if (!$boardData) {
                http_response_code(404);
                echo json_encode(['error' => 'Board not found']);
                return;
            }
            
            if ($boardData['owner_id'] != $user['user_id'] && !$this->board->hasAccess($boardId, $user['user_id'])) {
                http_response_code(403);
                echo json_encode(['error' => 'Access denied']);
                return;
            }
            
            if ($this->object->update($objectId, $data)) {
                echo json_encode(['success' => true]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Object not found']);
            }
        } catch(Exception $e) {
            error_log("updateBoardObject error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // DELETE /boards/{boardId}/objects/{objectId}
    public function deleteBoardObject($boardId, $objectId) {
        try {
            header('Content-Type: application/json');
            
            $user = AuthMiddleware::authenticate();
            
            $boardData = $this->board->getById($boardId);
            if (!$boardData) {
                http_response_code(404);
                echo json_encode(['error' => 'Board not found']);
                return;
            }
            
            if ($boardData['owner_id'] != $user['user_id'] && !$this->board->hasAccess($boardId, $user['user_id'])) {
                http_response_code(403);
                echo json_encode(['error' => 'Access denied']);
                return;
            }
            
            $this->object->delete($objectId);
            echo json_encode(['success' => true]);
        } catch(Exception $e) {
            error_log("deleteBoardObject error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // POST /boards/{boardId}/objects/bulk
    public function bulkUpdateBoardObjects($boardId, $data) {
        try {
            header('Content-Type: application/json');
            
            $user = AuthMiddleware::authenticate();
            
            $boardData = $this->board->getById($boardId);
            if (!$boardData) {
                http_response_code(404);
                echo json_encode(['error' => 'Board not found']);
                return;
            }
            
            if ($boardData['owner_id'] != $user['user_id'] && !$this->board->hasAccess($boardId, $user['user_id'])) {
                http_response_code(403);
                echo json_encode(['error' => 'Access denied']);
                return;
            }
            
            // Удаляем все существующие объекты
            $this->object->deleteByBoard($boardId);
            
            // Создаем новые
            $objects = $data['objects'] ?? [];
            foreach ($objects as $obj) {
                $this->object->create([
                    'board_id' => $boardId,
                    'type' => $obj['type'],
                    'content' => $obj['content'] ?? [],
                    'position_x' => $obj['position_x'] ?? 0,
                    'position_y' => $obj['position_y'] ?? 0,
                    'width' => $obj['width'] ?? null,
                    'height' => $obj['height'] ?? null,
                    'rotation' => $obj['rotation'] ?? 0
                ]);
            }
            
            echo json_encode(['success' => true]);
        } catch(Exception $e) {
            error_log("bulkUpdateBoardObjects error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
?>