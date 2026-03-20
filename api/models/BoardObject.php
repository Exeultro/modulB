<?php
class BoardObject {
    private $conn;
    private $table = 'board_objects';

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($data) {
        $query = "INSERT INTO " . $this->table . "
                (board_id, type, content, position_x, position_y, width, height, rotation)
                VALUES (:board_id, :type, :content, :position_x, :position_y, :width, :height, :rotation)
                RETURNING id";
        
        $stmt = $this->conn->prepare($query);
        
        $content = json_encode($data['content']);
        
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
    }

    public function update($id, $data) {
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
        
        $content = json_encode($data['content']);
        
        $stmt->bindParam(':content', $content);
        $stmt->bindParam(':position_x', $data['position_x']);
        $stmt->bindParam(':position_y', $data['position_y']);
        $stmt->bindParam(':width', $data['width']);
        $stmt->bindParam(':height', $data['height']);
        $stmt->bindParam(':rotation', $data['rotation']);
        $stmt->bindParam(':id', $id);
        
        return $stmt->execute();
    }

    public function setFocus($id, $user_id) {
        $query = "UPDATE " . $this->table . "
                  SET focused_by = :user_id
                  WHERE id = :id AND (focused_by IS NULL OR focused_by = :user_id)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':user_id', $user_id);
        
        return $stmt->execute();
    }

    public function releaseFocus($id) {
        $query = "UPDATE " . $this->table . "
                  SET focused_by = NULL
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        return $stmt->execute();
    }

    public function getByBoard($board_id) {
        $query = "SELECT o.*, u.name as focused_by_name
                  FROM " . $this->table . " o
                  LEFT JOIN users u ON o.focused_by = u.id
                  WHERE o.board_id = :board_id
                  ORDER BY o.created_at ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':board_id', $board_id);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>