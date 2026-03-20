<?php
class Board {
    private $conn;
    private $table = 'boards';

    public $id;
    public $name;
    public $owner_id;
    public $is_public;
    public $public_hash;
    public $likes_count;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create() {
        try {
            $this->public_hash = bin2hex(random_bytes(16));
            
            $query = "INSERT INTO " . $this->table . "
                    (name, owner_id, is_public, public_hash)
                    VALUES (:name, :owner_id, :is_public, :public_hash)
                    RETURNING id";
            
            $stmt = $this->conn->prepare($query);
            
            $stmt->bindParam(':name', $this->name);
            $stmt->bindParam(':owner_id', $this->owner_id);
            $stmt->bindParam(':is_public', $this->is_public, PDO::PARAM_BOOL);
            $stmt->bindParam(':public_hash', $this->public_hash);
            
            if($stmt->execute()) {
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $this->id = $row['id'];
                return true;
            }
            return false;
        } catch(PDOException $e) {
            error_log("Board create error: " . $e->getMessage());
            throw $e;
        }
    }

    public function getUserBoards($user_id) {
        try {
            $query = "SELECT DISTINCT b.*, u.name as owner_name, 
                      COALESCE((SELECT COUNT(*) FROM likes WHERE board_id = b.id), 0) as likes_count
                      FROM " . $this->table . " b
                      LEFT JOIN users u ON b.owner_id = u.id
                      LEFT JOIN board_access ba ON b.id = ba.board_id
                      WHERE b.owner_id = :user_id OR ba.user_id = :user_id
                      ORDER BY b.created_at DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            error_log("getUserBoards error: " . $e->getMessage());
            throw $e;
        }
    }

    public function getPublicBoards() {
        try {
            $query = "SELECT b.*, u.name as owner_name,
                      COALESCE((SELECT COUNT(*) FROM likes WHERE board_id = b.id), 0) as likes_count
                      FROM " . $this->table . " b
                      LEFT JOIN users u ON b.owner_id = u.id
                      WHERE b.is_public = true
                      ORDER BY b.likes_count DESC, b.created_at DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            error_log("getPublicBoards error: " . $e->getMessage());
            throw $e;
        }
    }

    public function getByHash($hash) {
        try {
            $query = "SELECT b.*, u.name as owner_name 
                      FROM " . $this->table . " b
                      LEFT JOIN users u ON b.owner_id = u.id
                      WHERE b.public_hash = :hash";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':hash', $hash);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            error_log("getByHash error: " . $e->getMessage());
            throw $e;
        }
    }

    public function grantAccess($board_id, $user_id) {
        try {
            $query = "INSERT INTO board_access (board_id, user_id)
                      VALUES (:board_id, :user_id)
                      ON CONFLICT (board_id, user_id) DO NOTHING";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':board_id', $board_id);
            $stmt->bindParam(':user_id', $user_id);
            
            return $stmt->execute();
        } catch(PDOException $e) {
            error_log("grantAccess error: " . $e->getMessage());
            throw $e;
        }
    }

    public function hasAccess($board_id, $user_id) {
        try {
            $query = "SELECT * FROM board_access 
                      WHERE board_id = :board_id AND user_id = :user_id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':board_id', $board_id);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->execute();
            
            return $stmt->rowCount() > 0;
        } catch(PDOException $e) {
            error_log("hasAccess error: " . $e->getMessage());
            throw $e;
        }
    }
}
?>