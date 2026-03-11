-- ============================================================
--  VeriFact — Migration: adicionar coluna bio à tabela users
--  Corre este SQL no phpMyAdmin se já tens a base de dados criada
--  (se ainda não criaste a DB, usa o database.sql normal)
-- ============================================================

ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `bio` TEXT NULL AFTER `avatar`;

-- Confirmar
SELECT 'Migration concluída! Coluna bio adicionada à tabela users.' AS resultado;
