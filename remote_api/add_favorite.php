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

// Verifica se já existe
$check_query = "SELECT id FROM favorites WHERE user_id = :user_id AND channel_number = :channel_number";
$check_stmt = $conn->prepare($check_query);
$check_stmt->bindParam(":user_id", $user_id);
$check_stmt->bindParam(":channel_number", $channel_number);
$check_stmt->execute();

if($check_stmt->rowCount() > 0) {
    echo json_encode(["success" => false, "message" => "Canal já está nos favoritos"]);
    exit();
}

// Insere novo favorito
$query = "INSERT INTO favorites (user_id, channel_number, channel_name, channel_logo) 
          VALUES (:user_id, :channel_number, :channel_name, :channel_logo)";

$stmt = $conn->prepare($query);
$stmt->bindParam(":user_id", $user_id);
$stmt->bindParam(":channel_number", $channel_number);
$stmt->bindParam(":channel_name", $channel_name);
$stmt->bindParam(":channel_logo", $channel_logo);

if($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Adicionado aos favoritos",
        "favorite_id" => $conn->lastInsertId()
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Erro ao adicionar favorito"]);
}
?>