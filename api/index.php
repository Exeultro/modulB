<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, ClientId");

// Включаем отображение ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/BoardController.php';
require_once __DIR__ . '/controllers/BoardObjectController.php';

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
$subaction = $segments[3] ?? '';

// Логируем запрос
error_log("Request: method=$request_method, resource=$resource, id=$id, action=$action, subaction=$subaction");

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
                echo json_encode(["error" => "Auth endpoint not found"]);
            }
        } else {
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
        }
        break;
        
    case 'boards':
        $boardController = new BoardController($db);
        $objectController = new BoardObjectController($db);
        
        if($request_method == 'GET') {
            if($id == 'user') {
                // GET /boards/user - доски пользователя
                $boardController->getUserBoards();
            } elseif($id == 'public') {
                // GET /boards/public - публичные доски
                $boardController->getPublicBoards();
            } elseif(!empty($id) && is_numeric($id) && $action == 'objects') {
                // GET /boards/{id}/objects - объекты доски по ID
                $objectController->getBoardObjects($id);
            } elseif(!empty($id)) {
                // GET /boards/{hash} - доска по хешу
                $boardController->getBoardByHash($id);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Board endpoint not found"]);
            }
        } elseif($request_method == 'POST') {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if(empty($id)) {
                // POST /boards - создать доску
                $boardController->create($data);
            } elseif($action == 'access') {
                // POST /boards/{id}/access - предоставить доступ
                $boardController->grantAccess($id, $data);
            } elseif($action == 'like') {
                // POST /boards/{id}/like - лайк
                $boardController->toggleLike($id);
            } elseif($action == 'objects') {
                if($subaction == 'bulk') {
                    // POST /boards/{id}/objects/bulk - массовое обновление
                    $objectController->bulkUpdateBoardObjects($id, $data);
                } else {
                    // POST /boards/{id}/objects - создать объект
                    $objectController->createBoardObject($id, $data);
                }
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Board POST endpoint not found"]);
            }
        } elseif($request_method == 'PUT') {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if($action == 'objects' && !empty($subaction)) {
                // PUT /boards/{id}/objects/{objectId} - обновить объект
                $objectController->updateBoardObject($id, $subaction, $data);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Board PUT endpoint not found"]);
            }
        } elseif($request_method == 'DELETE') {
            if($action == 'objects' && !empty($subaction)) {
                // DELETE /boards/{id}/objects/{objectId} - удалить объект
                $objectController->deleteBoardObject($id, $subaction);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Board DELETE endpoint not found"]);
            }
        } else {
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
        }
        break;
        
    default:
        http_response_code(404);
        echo json_encode(["error" => "Resource not found: " . $resource]);
        break;
}
?>