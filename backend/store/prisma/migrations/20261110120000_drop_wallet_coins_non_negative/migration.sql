-- A garantia de saldo nao negativo sai por decisao de produto: a compra e
-- travada no frontend, um item por vez, e a checagem antes da transacao passa a
-- ser a unica barreira.
--
-- Consequencia aceita: duas requisicoes simultaneas podem passar pela checagem
-- com o mesmo saldo e o saldo pode ficar negativo.
ALTER TABLE "wallets"
  DROP CONSTRAINT "wallets_coins_non_negative";
