<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, ClientId");

require_once 'config/database.php';
require_once 'controllers/AuthController.php';
require_once 'controllers/BoardController.php';

$database = new Database();
$db = $database->getConnection();

$request_method = $_SERVER["REQUEST_METHOD"];
$request_uri = $_SERVER["REQUEST_URI"];

// Убираем путь /api из URI
$path = parse_url($request_uri, PHP_URL_PATH);
$path = str_replace('/api', '', $path);
$segments = explode('/', trim($path, '/'));

$resource = $segments[0] ?? '';
$id = $segments[1] ?? '';
$action = $segments[2] ?? '';

switch($resource) {
    case 'auth':
        $authController = new AuthController($db);
        
        if($request_method == 'POST') {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if($id == 'register') {
                $authController->register($data);
            } elseif($id == 'login') {
                $authController->login($data);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Endpoint not found"]);
            }
        } else {
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
        }
        break;
        
    case 'boards':
        $boardController = new BoardController($db);
        
        if($request_method == 'GET') {
            if($id == 'user') {
                $boardController->getUserBoards();
            } elseif($id == 'public') {
                $boardController->getPublicBoards();
            } elseif(!empty($id)) {
                $boardController->getBoard($id);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Endpoint not found"]);
            }
        } elseif($request_method == 'POST') {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if(empty($id)) {
                $boardController->create($data);
            } elseif($action == 'access') {
                $boardController->grantAccess($id, $data);
            } elseif($action == 'like') {
                $boardController->toggleLike($id);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Endpoint not found"]);
            }
        } else {
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
        }
        break;
        
    default:
        http_response_code(404);
        echo json_encode(["error" => "Resource not found"]);
        break;
}
?>