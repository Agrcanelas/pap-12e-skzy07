<?php
include 'config.php';

$data = json_decode(file_get_contents("php://input"));

if(empty($data->user_id) || empty($data->channel_number)) {
    echo json_encode(["success" => false, "message" => "Dados incompletos"]);
    exit();
}

$user_id = (int)$data->user_id;
$channel_number = (int)$data->channel_number;

$query = "DELETE FROM favorites WHERE user_id = :user_id AND channel_number = :channel_number";

$stmt = $conn->prepare($query);
$stmt->bindParam(":user_id", $user_id);
$stmt->bindParam(":channel_number", $channel_number);

if($stmt->execute()) {
    if($stmt->rowCount() > 0) {
        echo json_encode([
            "success" => true,
            "message" => "Removido dos favoritos"
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Favorito não encontrado"
        ]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Erro ao remover favorito"]);
}
?>