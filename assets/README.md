# assets

Arte do catálogo. **Não** pertence a nenhum backend nem a nenhum frontend.

Em produção estes arquivos são servidos por um serviço de arquivo estático
próprio, roteado por `/assets/` no ingress. A coluna `image_url` do store guarda
o caminho relativo (`/assets/catalog/iron-will.png`), então quem serve pode mudar —
backend, nginx com volume, MinIO, S3 — sem tocar o banco nem o frontend.

Esta pasta é a **fonte da verdade**: o volume é um destino de implantação, não
onde a arte mora. Volume não tem histórico nem backup, e perdê-lo sem isto aqui
seria perder a arte.

## Em desenvolvimento

O proxy do Vite manda `/assets` para `ASSETS_PROXY_TARGET` (padrão
`http://localhost:8080`). Para servir esta pasta nessa porta:

```bash
bunx serve assets --listen 8080
```

Ainda não há arte aqui. Até ter, todo item cai no ícone de "sem arte" da loja —
tanto por `image_url` nulo quanto por 404 — e isso é o comportamento esperado,
não um bug.
