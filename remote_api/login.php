<?php
include 'config.php';

$data = json_decode(file_get_contents("php://input"));

if(empty($data->email) || empty($data->senha)) {
    echo json_encode(["success" => false, "message" => "Preencha todos os campos"]);
    exit();
}

$email = htmlspecialchars(strip_tags($data->email));
$senha = $data->senha;

$query = "SELECT id, nome, email, senha, data_criacao FROM users WHERE email = :email";
$stmt = $conn->prepare($query);
$stmt->bindParam(":email", $email);
$stmt->execute();

if($stmt->rowCount() > 0) {
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if(password_verify($senha, $row['senha'])) {
        echo json_encode([
            "success" => true,
            "message" => "Login efetuado com sucesso",
            "user" => [
                "id" => $row['id'],
                "nome" => $row['nome'],
                "email" => $row['email'],
                "data_criacao" => $row['data_criacao']
            ]
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Senha incorreta"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Email não encontrado"]);
}
?>