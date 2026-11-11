-- O debito nao confere mais o saldo no WHERE: quem confere e o service, antes
-- de abrir a transacao. Esta restricao e a rede de seguranca disso -- se duas
-- compras simultaneas passarem pela checagem com o mesmo saldo, o segundo
-- UPDATE e recusado pelo banco e a transacao da rollback.
--
-- Prisma nao modela CHECK no schema.prisma, por isso a migration e escrita a
-- mao e a restricao nao aparece no schema.
-- Saldo negativo que ja exista e zerado antes da restricao entrar, senao o
-- ALTER falha com 23514 em qualquer base que tenha sofrido o problema. Zerar
-- perdoa o excedente em vez de retirar os itens concedidos.
UPDATE "wallets" SET "coins" = 0 WHERE "coins" < 0;

ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_coins_non_negative" CHECK ("coins" >= 0);
