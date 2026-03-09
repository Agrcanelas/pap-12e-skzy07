<?php
include 'config.php';

$data = json_decode(file_get_contents("php://input"));

if(empty($data->user_id) || empty($data->channel_number) || empty($data->channel_name)) {
    echo json_encode(["success" => false, "message" => "Dados incompletos"]);
    exit();
}

$user_id = (int)$data->user_id;
$channel_number = (int)$data->channel_number;
$channel_name = htmlspecialchars(strip_tags($data->channel_name));
$channel_logo = isset($data->channel_logo) ? htmlspecialchars(strip_tags($data->channel_logo)) : '📺';

// Insere novo registro no histórico
$query = "INSERT INTO history (user_id, channel_number, channel_name, channel_logo) 
          VALUES (:user_id, :channel_number, :channel_name, :channel_logo)";

$stmt = $conn->prepare($query);
$stmt->bindParam(":user_id", $user_id);
$stmt->bindParam(":channel_number", $channel_number);
$stmt->bindParam(":channel_name", $channel_name);
$stmt->bindParam(":channel_logo", $channel_logo);

if($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Adicionado ao histórico",
        "history_id" => $conn->lastInsertId()
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Erro ao adicionar ao histórico"]);
}
?>