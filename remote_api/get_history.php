<?php
include 'config.php';

$data = json_decode(file_get_contents("php://input"));

if(empty($data->user_id)) {
    echo json_encode(["success" => false, "message" => "User ID obrigatório"]);
    exit();
}

$user_id = (int)$data->user_id;

// Limita aos últimos 50 registos
$query = "SELECT id, channel_number, channel_name, channel_logo, data_visualizado 
          FROM history 
          WHERE user_id = :user_id 
          ORDER BY data_visualizado DESC 
          LIMIT 50";

$stmt = $conn->prepare($query);
$stmt->bindParam(":user_id", $user_id);
$stmt->execute();

$history = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    "success" => true,
    "history" => $history
]);
?>