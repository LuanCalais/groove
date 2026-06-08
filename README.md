# 🎵 Groove

Uma rede social temática de música — só texto, sem distrações.

Projeto de estudo construído com **Node.js + Express + SQLite**, inspirado no formato do Threads: um feed de posts curtos onde o único assunto permitido é música. Você fala sobre o que está ouvindo, faz reviews de álbuns, recomenda artistas, discute letras, faz perguntas pra galera.

---

## O que o projeto faz

- Cadastro e login de usuários com autenticação via JWT
- Criação de posts de até 500 caracteres com tipo musical (`review`, `opinion`, `recommendation`, `question`, `listening_now`)
- Referência opcional a uma música, álbum ou artista em cada post
- Feed global com os posts mais recentes
- Feed personalizado com posts de quem você segue
- Sistema de likes (toggle) e comentários
- Perfil de usuário com contagem de posts, seguidores e seguindo
- Follow/unfollow entre usuários
- Tags temáticas nos posts (`#jazz`, `#mpb`, `#shoegaze`...)
- Migrations versionadas para o banco de dados

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js |
| Framework | Express |
| Banco de dados | SQLite via `better-sqlite3` |
| Autenticação | JWT + bcrypt |
| Frontend (planejado) | Vue 3 + Naive UI |

---

## Estrutura

```
groove/
├── migrations/          # arquivos SQL versionados
├── src/
│   ├── server.js        # entry point
│   ├── db/
│   │   ├── connection.js
│   │   └── migrate.js
│   ├── middlewares/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       ├── posts.js
│       └── users.js
└── .env.example
```

---

## Rodando o projeto

```bash
# instalar dependências
npm install better-sqlite3 --nodedir=/usr
npm install

# configurar variáveis de ambiente
cp .env.example .env

# rodar as migrations
npm run migrate

# subir em modo desenvolvimento
npm run dev
```

O servidor sobe em `http://localhost:3000`.

---

## Principais endpoints

```
POST   /api/auth/register
POST   /api/auth/login

GET    /api/posts              # feed global
GET    /api/posts/feed         # feed de quem você segue
POST   /api/posts              # criar post
POST   /api/posts/:id/like     # curtir / descurtir
POST   /api/posts/:id/comments # comentar

GET    /api/users/:username         # perfil
PATCH  /api/users/me                # editar perfil
POST   /api/users/:username/follow  # seguir / deixar de seguir
```

---

## Status

Projeto em desenvolvimento — v1 cobre o backend completo. Frontend em Vue está planejado para a próxima etapa.