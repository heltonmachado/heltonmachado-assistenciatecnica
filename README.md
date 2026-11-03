# Assistência Técnica

Aplicação de gestão de chamados com frontend React/TypeScript, API REST Laravel 12, MySQL e Redis.

## Iniciar com Docker

Requisitos: Docker Engine e Docker Compose.

```bash
docker compose up --build
```

Abra:

- Aplicação: http://localhost:3000
- API: http://localhost:8000/api
- Saúde da API: http://localhost:8000/api/health
- Login: http://localhost:3000

O Compose cria o banco, aguarda MySQL e Redis ficarem prontos, executa as migrações e inicia os serviços. Os dados MySQL ficam no volume `mysql_data`, e anexos privados das ordens de serviço ficam em `app_storage`. Para parar, use `Ctrl+C`; para encerrar os containers, execute `docker compose down`.

O login inicial é criado com `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` do arquivo `.env` (copie `.env.example` e defina senhas fortes para a conta administrativa e para o banco antes de iniciar). Os valores ficam somente no `.env`, que não deve ser versionado. A conta é criada uma única vez: alterar as variáveis depois não redefine a senha de uma conta existente.

Defina `DB_PASSWORD` e `DB_ROOT_PASSWORD` no `.env` antes da primeira inicialização; o Compose não usa senhas padrão se essas variáveis estiverem ausentes. Em instalações já inicializadas, alterar essas variáveis não muda as senhas existentes no volume MySQL.

## Executar localmente sem Docker

Requisitos: PHP 8.2+, Composer, extensões PDO MySQL e Redis, Node.js 20.19+ e MySQL/Redis locais.

Backend:

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

Configure no `backend/.env` as conexões locais do MySQL e Redis.

Frontend, em outro terminal:

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev -- --host 0.0.0.0
```

## Módulos

- **Ordens de serviço:** chamados com diagnóstico, peças utilizadas, aprovação do orçamento, garantia, anexos privados (PDF e imagens até 10 MB) e impressão para salvar em PDF pelo navegador.
- **Chamados:** listagem pesquisável, filtros, paginação, edição, exclusão, vínculo opcional com cliente e histórico de transições.
- **Kanban:** organização dos chamados por status, com movimentação entre etapas.
- **Clientes:** cadastro, edição e exclusão; chamados existentes são preservados quando um cliente é removido.
- **Estoque:** catálogo de produtos, alerta de estoque mínimo, entradas/saídas com motivo e histórico de movimentações. Saídas que deixariam saldo negativo são rejeitadas.
- **Financeiro:** receitas e despesas, vencimentos, confirmação/reabertura de pagamento e resumo de valores pagos e pendências.
- **Usuários:** criação, ativação/desativação e alteração de perfil; disponível apenas para administradores. Desativar uma conta também revoga seus tokens ativos.
- **Relatórios:** resumo por período de chamados por status, receitas/despesas pagas, pendências e estoque abaixo do mínimo.

## API

As rotas abaixo, exceto saúde e login, exigem `Authorization: Bearer <token>`. O token tem validade de 12 horas.

- `GET /api/health`
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET|POST /api/tickets`, `GET|PUT|PATCH|DELETE /api/tickets/{id}`, `GET /api/tickets/{id}/history`
- Anexos autenticados: `GET|POST /api/tickets/{id}/attachments`, `GET /api/tickets/{id}/attachments/{attachment}/download`, `DELETE /api/tickets/{id}/attachments/{attachment}`
- `GET|POST /api/clients`, `PUT|DELETE /api/clients/{id}`
- `GET|POST /api/products`, `PUT|PATCH /api/products/{id}`, `POST /api/products/{id}/stock`, `GET /api/products/{id}/movements`
- `GET|POST /api/finance`, `PUT|DELETE /api/finance/{id}`
- `GET /api/reports/overview?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Administradores: `GET|POST /api/users`, `PATCH /api/users/{id}`

O login limita tentativas por IP. A interface valida formato de e-mail e política da senha antes de enviar; a API confere as credenciais e armazena somente o hash da senha. O token fica em `sessionStorage` e é revogado ao sair. Os status dos chamados são `open`, `in_progress`, `completed` e `cancelled`; prioridades: `low`, `normal`, `high` e `urgent`.

## Testes

```bash
cd backend && php artisan test
cd frontend && npm run build
cd frontend && npm run lint
```

A página de entrada do frontend React é `frontend/index.html`. A pasta `frontend/dist` é gerada automaticamente pelo build e não deve ser editada manualmente.
