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
            
            $content = is_array($data['content']) ? json_encode($data['content']) : $data['content'];
            
            // Приводим типы данных
            $board_id = (int)$data['board_id'];
            $type = (string)$data['type'];
            $position_x = (int)$data['position_x'];
            $position_y = (int)$data['position_y'];
            $width = $data['width'] !== null ? (int)$data['width'] : null;
            $height = $data['height'] !== null ? (int)$data['height'] : null;
            $rotation = (int)($data['rotation'] ?? 0);
            
            $stmt->bindParam(':board_id', $board_id, PDO::PARAM_INT);
            $stmt->bindParam(':type', $type, PDO::PARAM_STR);
            $stmt->bindParam(':content', $content, PDO::PARAM_STR);
            $stmt->bindParam(':position_x', $position_x, PDO::PARAM_INT);
            $stmt->bindParam(':position_y', $position_y, PDO::PARAM_INT);
            
            if ($width === null) {
                $stmt->bindValue(':width', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindParam(':width', $width, PDO::PARAM_INT);
            }
            
            if ($height === null) {
                $stmt->bindValue(':height', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindParam(':height', $height, PDO::PARAM_INT);
            }
            
            $stmt->bindParam(':rotation', $rotation, PDO::PARAM_INT);
            
            error_log("Creating object: board_id=$board_id, type=$type, pos=($position_x,$position_y), size=($width,$height)");
            
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
            $board_id = (int)$board_id;
            $stmt->bindParam(':board_id', $board_id, PDO::PARAM_INT);
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
            $id = (int)$id;
            $position_x = (int)$data['position_x'];
            $position_y = (int)$data['position_y'];
            $width = $data['width'] !== null ? (int)$data['width'] : null;
            $height = $data['height'] !== null ? (int)$data['height'] : null;
            $rotation = (int)($data['rotation'] ?? 0);
            
            $stmt->bindParam(':content', $content, PDO::PARAM_STR);
            $stmt->bindParam(':position_x', $position_x, PDO::PARAM_INT);
            $stmt->bindParam(':position_y', $position_y, PDO::PARAM_INT);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->bindParam(':rotation', $rotation, PDO::PARAM_INT);
            
            if ($width === null) {
                $stmt->bindValue(':width', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindParam(':width', $width, PDO::PARAM_INT);
            }
            
            if ($height === null) {
                $stmt->bindValue(':height', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindParam(':height', $height, PDO::PARAM_INT);
            }
            
            error_log("Updating object id=$id: pos=($position_x,$position_y), size=($width,$height), rotation=$rotation");
            
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
            $id = (int)$id;
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
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
            $board_id = (int)$board_id;
            $stmt->bindParam(':board_id', $board_id, PDO::PARAM_INT);
            return $stmt->execute();
        } catch(PDOException $e) {
            error_log("BoardObject deleteByBoard error: " . $e->getMessage());
            throw $e;
        }
    }
}
?>