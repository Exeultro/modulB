<?php
class BoardObject {
    private $conn;
    private $table = 'board_objects';

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($data) {
        try {
            $query = "INSERT INTO " . $this->table . "
                    (board_id, type, content, position_x, position_y, width, height, rotation)
                    VALUES (:board_id, :type, :content, :position_x, :position_y, :width, :height, :rotation)
                    RETURNING id";
            
            $stmt = $this->conn->prepare($query);
            
            // Убеждаемся, что content - это JSON строка
            $content = is_array($data['content']) ? json_encode($data['content']) : $data['content'];
            
            $stmt->bindParam(':board_id', $data['board_id']);
            $stmt->bindParam(':type', $data['type']);
            $stmt->bindParam(':content', $content);
            $stmt->bindParam(':position_x', $data['position_x']);
            $stmt->bindParam(':position_y', $data['position_y']);
            $stmt->bindParam(':width', $data['width']);
            $stmt->bindParam(':height', $data['height']);
            $stmt->bindParam(':rotation', $data['rotation']);
            
            if($stmt->execute()) {
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                return $row['id'];
            }
            return false;
        } catch(PDOException $e) {
            error_log("BoardObject create error: " . $e->getMessage());
            throw $e;
        }
    }

    public function getByBoard($board_id) {
        try {
            $query = "SELECT * FROM " . $this->table . " 
                      WHERE board_id = :board_id 
                      ORDER BY created_at ASC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':board_id', $board_id);
            $stmt->execute();
            
            $objects = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Декодируем content для каждого объекта
            foreach ($objects as &$obj) {
                if (is_string($obj['content'])) {
                    $obj['content'] = json_decode($obj['content'], true);
                }
            }
            
            return $objects;
        } catch(PDOException $e) {
            error_log("getByBoard error: " . $e->getMessage());
            throw $e;
        }
    }

    public function update($id, $data) {
        try {
            $query = "UPDATE " . $this->table . "
                      SET content = :content,
                          position_x = :position_x,
                          position_y = :position_y,
                          width = :width,
                          height = :height,
                          rotation = :rotation,
                          updated_at = CURRENT_TIMESTAMP
                      WHERE id = :id";
            
            $stmt = $this->conn->prepare($query);
            
            $content = is_array($data['content']) ? json_encode($data['content']) : $data['content'];
            
            $stmt->bindParam(':content', $content);
            $stmt->bindParam(':position_x', $data['position_x']);
            $stmt->bindParam(':position_y', $data['position_y']);
            $stmt->bindParam(':width', $data['width']);
            $stmt->bindParam(':height', $data['height']);
            $stmt->bindParam(':rotation', $data['rotation']);
            $stmt->bindParam(':id', $id);
            
            return $stmt->execute();
        } catch(PDOException $e) {
            error_log("BoardObject update error: " . $e->getMessage());
            throw $e;
        }
    }

    public function delete($id) {
        try {
            $query = "DELETE FROM " . $this->table . " WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            return $stmt->execute();
        } catch(PDOException $e) {
            error_log("BoardObject delete error: " . $e->getMessage());
            throw $e;
        }
    }

    public function deleteByBoard($board_id) {
        try {
            $query = "DELETE FROM " . $this->table . " WHERE board_id = :board_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':board_id', $board_id);
            return $stmt->execute();
        } catch(PDOException $e) {
            error_log("BoardObject deleteByBoard error: " . $e->getMessage());
            throw $e;
        }
    }
}
?>