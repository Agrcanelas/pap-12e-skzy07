<?php
include 'config.php';

$data = json_decode(file_get_contents("php://input"));

if(empty($data->nome) || empty($data->email) || empty($data->senha)) {
    echo json_encode(["success" => false, "message" => "Preencha todos os campos"]);
    exit();
}

$nome = htmlspecialchars(strip_tags($data->nome));
$email = htmlspecialchars(strip_tags($data->email));
$senha = password_hash($data->senha, PASSWORD_BCRYPT);

// Verifica se email já existe
$query = "SELECT id FROM users WHERE email = :email";
$stmt = $conn->prepare($query);
$stmt->bindParam(":email", $email);
$stmt->execute();

if($stmt->rowCount() > 0) {
    echo json_encode(["success" => false, "message" => "Email já registado"]);
    exit();
}

// Insere novo utilizador
$query = "INSERT INTO users (nome, email, senha) VALUES (:nome, :email, :senha)";
$stmt = $conn->prepare($query);
$stmt->bindParam(":nome", $nome);
$stmt->bindParam(":email", $email);
$stmt->bindParam(":senha", $senha);

if($stmt->execute()) {
    echo json_encode([
        "success" => true, 
        "message" => "Conta criada com sucesso",
        "user" => [
            "id" => $conn->lastInsertId(),
            "nome" => $nome,
            "email" => $email
        ]
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Erro ao criar conta"]);
}
?>