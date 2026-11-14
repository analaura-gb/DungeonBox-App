# Deploy

Oito serviços, oito imagens, oito workflows de CD. Cada um é disparado na mão e
termina com uma imagem no GitHub Container Registry. O `kubectl apply` é um
passo separado, feito por você.

```
Actions > <Serviço> CD > Run workflow
  └─ job ci     : chama o CI do serviço no commit escolhido
  └─ job image  : buildar + publicar em ghcr.io   (só roda se o CI passar)
        │
        └─ você copia a referência da imagem do Summary do run
              │
              └─ atualiza o Deployment e dá kubectl apply
```

O job `ci` é o **mesmo arquivo** que roda nos PRs: o CD não tem cópia dos
testes. Se o CI mudar, o CD muda com ele.

Os oito são independentes. Deployar só o store frontend é rodar um workflow, e
os outros sete ficam onde estão.

## Imagens

| Serviço | Workflow | Contexto do build | Imagem (`ghcr.io/analaura-gb/…`) | Porta |
| --- | --- | --- | --- | --- |
| auth backend | `auth-backend-cd.yml` | `backend/auth` | `dungeonbox-auth-backend` | 3000 |
| store backend | `store-backend-cd.yml` | `backend/store` | `dungeonbox-store-backend` | 3001 |
| ranking backend | `ranking-backend-cd.yml` | `backend/ranking` | `dungeonbox-ranking-backend` | 3002 |
| game backend | `game-backend-cd.yml` | `backend/game` | `dungeonbox-game-backend` | 3003 |
| auth frontend | `auth-frontend-cd.yml` | `frontend/auth` | `dungeonbox-auth-frontend` | 8080 |
| store frontend | `store-frontend-cd.yml` | `frontend/store` | `dungeonbox-store-frontend` | 8080 |
| ranking frontend | `ranking-frontend-cd.yml` | `frontend/ranking` | `dungeonbox-ranking-frontend` | 8080 |
| game frontend | `game-frontend-cd.yml` | `frontend/game` | `dungeonbox-game-frontend` | 8080 |

As portas dos backends são as mesmas do `main.ts` de cada um, já fixadas como
`ENV PORT` no Dockerfile. Os frontends são todos 8080 porque são nginx, e cada
um está no seu próprio Pod — porta igual não colide.

Cada push publica duas tags: o **SHA curto** (12 caracteres) e `latest`. No yaml
do Kubernetes use o SHA. Com `latest` no Deployment, `kubectl describe` não
responde o que está no ar, rollback não existe e um `kubectl rollout restart`
pode trocar a versão sem ninguém pedir. O Summary de cada run imprime a
referência pronta para copiar.

### Tamanho das imagens

| Imagem | Tamanho (descomprimido) |
| --- | --- |
| cada backend | 218 MB |
| cada frontend | 49 MB |
| cada migrator | 513 MB (não é publicada) |

Dos 218 MB de um backend, 94 MB são o binário do Bun, 8 MB o Alpine, 128 MB o
`node_modules` de produção e 312 kB o `dist`. Nos frontends, 43 MB são o
nginx-unprivileged e o resto é o bundle.

O stage `prod-deps` escreve um `bunfig.toml` com `peer = false` antes de
instalar. **Sem essa linha a imagem vai a 452 MB**: o `@prisma/client` declara
`prisma` e `typescript` como peerDependencies *opcionais*, e o bun instala peer
opcional por padrão. Entra então o CLI inteiro do prisma — com o Studio
(`react-dom`, `chart.js`), o `@prisma/dev` (`effect`, `hono`, `valibot`) e os
engines. Nada disso roda no container: a conexão é por driver adapter
(`@prisma/adapter-pg`) e as migrations ficam no stage `migrator`.

O `bunfig.toml` é escrito dentro do stage e não é versionado, então `bun install`
na sua máquina continua instalando os peers. O preço dessa escolha: o CI instala
*com* peers e o CD instala sem. Se algum dia uma dependência de produção passar a
precisar de um peer auto-instalado, o CI não acusa — o erro aparece na subida do
container. É o tipo de falha que a probe pega, mas só depois do `apply`.

### Arquitetura

O cluster é todo ARM: as TV boxes são `aarch64`, com userland de 64 bits e
kernel 6.1 do Armbian. Imagem `amd64` **não roda lá** — o pod sobe e morre com
`exec format error`, sem nenhuma pista útil no log do app.

Por isso os oito CDs rodam em `runs-on: ubuntu-24.04-arm`, o runner ARM nativo
do GitHub, gratuito e sem limite em repositório público. É build nativo, não
emulação: fazer QEMU no runner amd64 levaria o `bun install` mais o build muito
além dos 20 minutos de timeout.

As três bases que usamos têm `arm64`: `oven/bun:1.3.12-alpine`,
`nginxinc/nginx-unprivileged:1.27-alpine` e `postgres:16`.

Consequência prática: **a imagem publicada no ghcr.io não roda numa máquina
x86.** Para testar local, builde local — `docker build` na sua máquina produz
`amd64` e funciona normalmente. Se um dia entrar um nó x86 no cluster, aí sim
vale converter os CDs para build multi-arquitetura (dois runners publicando por
digest e um job final juntando o manifesto).

Antes de confiar numa box nova, dois comandos nela:

```bash
uname -m && getconf LONG_BIT      # precisa ser aarch64 e 64
uname -r && grep -c cgroup2 /proc/filesystems   # kernel 5.x+ e cgroup2 para o k3s
```

A armadilha é CPU de 64 bits com Armbian de 32 bits instalado. Se sair
`armv7l`, não há saída fácil: o Bun não publica build para armv7, só amd64 e
arm64.

## O que configurar no GitHub

Settings > Environments > **New environment** > `production`.

Os oito CDs apontam para esse Environment. É lá que ficam os valores, e é lá que
dá para marcar *Required reviewers* — com isso o build espera sua aprovação
antes de publicar.

### Secrets do Environment

Só os frontends precisam, e os **quatro usam os mesmos cinco valores**. Você
cadastra uma vez e serve para todos:

| Secret | O que é | Exemplo |
| --- | --- | --- |
| `VITE_API_BASE_URL` | prefixo das chamadas de API | `/api` |
| `VITE_AUTH_URL` | onde o ingress serve o auth frontend | `/auth/` |
| `VITE_STORE_URL` | onde o ingress serve o store frontend | `/store/` |
| `VITE_RANKING_URL` | onde o ingress serve o ranking frontend | `/ranking/` |
| `VITE_GAME_URL` | onde o ingress serve o game frontend | `/game/` |

Os cinco são obrigatórios nos quatro frontends — o `assertEnv` do `vite.config`
quebra o build se faltar qualquer um, porque todos têm o menu que linka para os
outros três.

Os **backends não precisam de nenhum secret no GitHub**. Nada do que eles leem é
necessário para buildar a imagem: `DATABASE_URL` e `JWT_SECRET` são lidos em
runtime, dentro do cluster. O `prisma generate` roda no build com uma
`DATABASE_URL` de mentira, fixa no Dockerfile, porque ele exige que a variável
exista mas não abre conexão nenhuma.

> **Sobre os `VITE_*`:** o Vite troca `import.meta.env.VITE_*` pelo valor
> literal no bundle. Esses valores vão dentro do JS que o navegador baixa —
> estar em secret os mantém fora do repositório, que é público, mas não os torna
> privados. Para URL de rota pública isso está certo. Segredo de verdade
> (`JWT_SECRET`, senha de banco) nunca pode entrar num build de frontend, em
> secret ou fora dele.

### Nada de PAT

O login no ghcr.io usa o `GITHUB_TOKEN` do próprio run, com
`permissions: packages: write` no job. Não há token para criar, guardar nem
rotacionar.

## O que configurar no cluster

Isto **não** é segredo do GitHub: é Secret (ou ConfigMap) do Kubernetes, lido em
runtime. Vale um Secret por backend — o `DATABASE_URL` é diferente em cada um.

| Variável | Quem lê | Observação |
| --- | --- | --- |
| `DATABASE_URL` | auth, store, ranking, game | um banco por serviço, nunca compartilhado |
| `JWT_SECRET` | auth, store, ranking, game | **o mesmo valor nos quatro**: o auth assina, os outros validam |
| `COOKIE_SECURE` | auth | `true` em produção (cookie só por HTTPS) |
| `STORE_API_URL` | auth, game | o auth cria a carteira no register; o game debita/credita |
| `RANKING_API_URL` | game | o game publica resultado de partida no ranking |
| `PORT` | todos os backends | opcional; o Dockerfile de cada um já define a sua |

Dá para injetar com `envFrom`, que é o que mais se parece com carregar um
`.env`:

```yaml
containers:
  - name: game
    image: ghcr.io/analaura-gb/dungeonbox-game-backend:a1b2c3d4e5f6
    envFrom:
      - secretRef:
          name: game-secrets      # DATABASE_URL, JWT_SECRET
      - configMapRef:
          name: game-config       # STORE_API_URL, RANKING_API_URL
```

O `JWT_SECRET` igual nos quatro é o que faz um token emitido pelo auth ser
aceito pelo store, pelo ranking e pelo game. Valor diferente em um deles e as
chamadas autenticadas daquele serviço passam a dar 401 sem nenhuma pista no log.

As `*_API_URL` apontam para o Service do cluster, não para localhost nem para
URL pública — por exemplo `http://store-backend:3001`. A chamada é de Pod para
Pod e não precisa sair pelo ingress.

Repare que o valor é **só a origem, sem `/api`**: o código monta
`${STORE_API_URL}/api/store/me/wallet`. Com `/api` no fim da variável a URL sai
`/api/api/store/...` e o 404 aparece só na hora que o auth tenta criar a
carteira, não na subida do Pod. É assim nos `.env.dev` também
(`STORE_API_URL="http://localhost:3001"`).

Nenhum `.env` entra nas imagens — os `.dockerignore` barram todos. Os `.env.dev`
e `.env.test` versionados são de desenvolvimento e de teste, e se um deles
vazasse para dentro da imagem o container subiria apontando para `localhost`.

### Imagem privada

Em repositório público, o *package* no ghcr.io nasce **privado**. O cluster não
vai conseguir puxar até você resolver isso, de um dos dois jeitos:

- Package settings > Change visibility > Public — mais simples, e a imagem não
  tem segredo dentro. São oito packages, um por serviço.
- Ou um `imagePullSecret` no namespace, com um PAT de `read:packages`.

### Migrations

O `prisma migrate deploy` não roda no CD nem na subida do app: o container do
app não tem o CLI do prisma. Os quatro Dockerfiles de backend têm um stage
`migrator` para isso, que não é buildado pelo CD:

```bash
docker build --target migrator -t dungeonbox-game-migrator backend/game
```

Para a primeira vez, rodar `bun run db:migrate:prod` da sua máquina contra cada
banco resolve. Depois vale virar um Job no cluster, com essa imagem, antes de
cada `apply` que tenha migration nova.

## O que o ingress precisa fazer

Os bundles são buildados com `base: "/auth/"`, `"/store/"`, `"/ranking/"` e
`"/game/"`, ou seja o `index.html` pede `/game/assets/index-<hash>.js` —
caminho absoluto. O ingress tem que **repassar o caminho inteiro**, sem rewrite:
tirar o prefixo na borda quebra todo link do bundle. Por isso, dentro de cada
imagem, os arquivos ficam sob o seu próprio prefixo.

| Caminho | Vai para |
| --- | --- |
| `/auth/` | auth frontend (8080) |
| `/store/` | store frontend (8080) |
| `/ranking/` | ranking frontend (8080) |
| `/game/` | game frontend (8080) |
| `/api/auth/` | auth backend (3000) |
| `/api/store/` | store backend (3001) |
| `/api/ranking/` | ranking backend (3002) |
| `/api/game/` | game backend (3003) |
| `/assets/` | serviço de arquivo estático da arte (veja `assets/README.md`) |

O `/assets/` não é de nenhum dos oito: o ranking e o game pedem arte de lá
(`/assets/characters/…`, `/assets/map/floor.png`, `/assets/audio/…`), e o nginx
de cada frontend devolve 404 para qualquer caminho fora do seu prefixo. Sem essa
rota no ingress, a tela carrega e a arte não.

Os quatro frontends respondem `GET /healthz` com `200 ok`, fora do base path —
dá para usar como liveness e readiness probe sem depender do bundle estar no
lugar.

## Probes e encerramento

Os quatro backends expõem duas rotas, sob o prefixo global:

| Rota | Responde | Para quê |
| --- | --- | --- |
| `GET /api/health/live` | sempre `200 {"status":"ok"}` | liveness |
| `GET /api/health/ready` | `200` ou `503`, consultando o banco | readiness |

Nenhuma das duas é alcançável de fora: o ingress roteia `/api/auth/`,
`/api/store/` e companhia, e `/api/health` não casa com regra nenhuma. Quem
chama é o kubelet, direto no IP do Pod.

```yaml
livenessProbe:
  httpGet: { path: /api/health/live, port: 3000 }
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /api/health/ready, port: 3000 }
  periodSeconds: 5
  timeoutSeconds: 3
```

**Liveness não consulta o banco, de propósito.** Se consultasse, uma piscada do
Postgres reiniciaria todos os pods de todos os serviços ao mesmo tempo — e
reiniciar não conserta banco fora do ar, só empilha `CrashLoopBackOff` em cima
da indisponibilidade. Liveness falha quando o conserto é reiniciar; não é o
caso aqui.

**Readiness consulta**, porque um pod sem banco não atende nada útil e deve sair
do balanceamento do Service sem ser reiniciado. Quando o banco volta, o pod
volta sozinho. Verificado: com o Postgres parado, `ready` responde `503` em 2s e
`live` continua `200`; o banco volta e `ready` volta a `200`, com zero restarts.

A verificação tem limite de 2 segundos por dentro. Com o Postgres fora do ar o
pool do `pg` não recusa a conexão, ele espera — sem o limite a rota pendurava
por mais de 10s e quem desistia era o probe. Mantenha o `timeoutSeconds` do
probe **acima** de 2s para o kubelet receber um `503` em vez de um timeout: a
diferença aparece no evento do Pod e economiza bastante diagnóstico.

### Encerramento

Os quatro `main.ts` chamam `app.enableShutdownHooks()`. Sem isso o Nest não
escuta sinal nenhum e, como o processo roda em PID 1 — onde o Linux não instala
handler padrão —, o SIGTERM simplesmente não fazia nada: medido, `docker stop`
esperava o timeout inteiro e terminava em SIGKILL, com exit 137 e nenhuma linha
de log.

No cluster isso custava os 30s de `terminationGracePeriodSeconds` em **todo**
rollout, descartando requisição em andamento, e deixava o `onModuleDestroy` do
`PrismaService` como código morto. Depois da correção: 319ms e exit 0.

Os frontends já paravam bem: a imagem `nginx-unprivileged` traz
`STOPSIGNAL SIGQUIT`, que é o encerramento gracioso do nginx — 267ms, exit 0.
