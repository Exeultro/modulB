<?php
class Like {
    private $conn;
    private $table = 'likes';

    public function __construct($db) {
        $this->conn = $db;
    }

    public function toggle($board_id, $user_id) {
        // Проверяем, есть ли уже лайк
        $checkQuery = "SELECT id FROM " . $this->table . "
                       WHERE board_id = :board_id AND user_id = :user_id";
        
        $checkStmt = $this->conn->prepare($checkQuery);
        $checkStmt->bindParam(':board_id', $board_id);
        $checkStmt->bindParam(':user_id', $user_id);
        $checkStmt->execute();
        
        if($checkStmt->rowCount() > 0) {
            // Удаляем лайк
            $deleteQuery = "DELETE FROM " . $this->table . "
                            WHERE board_id = :board_id AND user_id = :user_id";
            $deleteStmt = $this->conn->prepare($deleteQuery);
            $deleteStmt->bindParam(':board_id', $board_id);
            $deleteStmt->bindParam(':user_id', $user_id);
            $deleteStmt->execute();
            
            // Обновляем счетчик лайков
            $this->updateLikesCount($board_id);
            return ['action' => 'removed'];
        } else {
            // Добавляем лайк
            $insertQuery = "INSERT INTO " . $this->table . " (board_id, user_id)
                            VALUES (:board_id, :user_id)";
            $insertStmt = $this->conn->prepare($insertQuery);
            $insertStmt->bindParam(':board_id', $board_id);
            $insertStmt->bindParam(':user_id', $user_id);
            $insertStmt->execute();
            
            // Обновляем счетчик лайков
            $this->updateLikesCount($board_id);
            return ['action' => 'added'];
        }
    }

    private function updateLikesCount($board_id) {
        $query = "UPDATE boards 
                  SET likes_count = (SELECT COUNT(*) FROM likes WHERE board_id = :board_id)
                  WHERE id = :board_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':board_id', $board_id);
        $stmt->execute();
    }
}
?>