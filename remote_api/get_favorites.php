<?php
include 'config.php';

$data = json_decode(file_get_contents("php://input"));

if(empty($data->user_id)) {
    echo json_encode(["success" => false, "message" => "User ID obrigatório"]);
    exit();
}

$user_id = (int)$data->user_id;

$query = "SELECT id, channel_number, channel_name, channel_logo, data_adicionado 
          FROM favorites 
          WHERE user_id = :user_id 
          ORDER BY data_adicionado DESC";

$stmt = $conn->prepare($query);
$stmt->bindParam(":user_id", $user_id);
$stmt->execute();

$favorites = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    "success" => true,
    "favorites" => $favorites
]);
?>