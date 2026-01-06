<?php
include 'config.php';

$data = json_decode(file_get_contents("php://input"));

if(empty($data->user_id)) {
    echo json_encode(["success" => false, "message" => "User ID obrigatório"]);
    exit();
}

$user_id = (int)$data->user_id;

$query = "DELETE FROM history WHERE user_id = :user_id";

$stmt = $conn->prepare($query);
$stmt->bindParam(":user_id", $user_id);

if($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Histórico limpo com sucesso",
        "deleted_count" => $stmt->rowCount()
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Erro ao limpar histórico"]);
}
?>