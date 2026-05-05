# Gestão Clínica — SaaS Oftalmológico v5.0

Sistema de gestão completo para clínicas oftalmológicas, desenvolvido como PWA (Progressive Web App) com Firebase, sem frameworks frontend.

---

## Stack Técnica

| Camada         | Tecnologia                          |
| -------------- | ----------------------------------- |
| Frontend       | HTML5 + CSS3 + Vanilla JS (ES6+)    |
| Banco de Dados | Firebase Realtime Database          |
| Autenticação   | Firebase Auth                       |
| Charts         | Chart.js 4                          |
| Icons          | Lucide Icons                        |
| Exportação     | SheetJS (Excel) + jsPDF + AutoTable |
| Hospedagem     | Vercel (estático)                   |

---

## Módulos

| Módulo        | Rota            | Acesso        |
| ------------- | --------------- | ------------- |
| Recepção      | `#recepcao`     | Todos         |
| Call Center   | `#callcenter`   | Por permissão |
| Cirúrgico     | `#cirurgico`    | Admin         |
| Honorários    | `#honorarios`   | Admin         |
| Faturamento   | `#faturamento`  | Por permissão |
| Patrimônio    | `#patrimonio`   | Por permissão |
| Estoque       | `#estoque`      | Por permissão |
| Fornecedores  | `#fornecedores` | Por permissão |
| Administração | `#admin`        | Admin         |

---

## Configuração do Firebase

### 1. Criar projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um projeto Web
3. Ative **Authentication** → Provedores → E-mail/Senha
4. Ative **Realtime Database** → Crie banco em modo bloqueado
5. Copie as credenciais do projeto

### 2. Configurar `firebase-config.js`

Substitua os valores no arquivo `firebase-config.js`:

```js
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
const CLINICA_ID = "clinica_01"; // Identificador único da clínica
```

### 3. Regras do Realtime Database

Configure as regras de segurança no console Firebase:

```json
{
  "rules": {
    "dados": {
      "$clinicaId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

> **Produção**: implemente regras mais restritivas com validação por UID.

### 4. Criar o primeiro Admin

No Console Firebase → Authentication → Criar usuário (e-mail + senha).

Em seguida, no Console Firebase → Realtime Database, crie manualmente:

```
dados/clinica_01/usuarios/{UID_DO_USUARIO}/
  nome: "Admin Master"
  email: "admin@suaclinica.com"
  admin: true
  permissoes:
    recepcao: true
    call_center: true
    cirurgico: true
    honorarios: true
    faturamento: true
    patrimonio: true
    estoque: true
    fornecedores: true
```

---

## Deploy no Vercel

1. Faça upload do projeto ou conecte ao repositório GitHub
2. No painel do Vercel:
   - **Framework Preset**: `Other`
   - **Build Command**: _(deixar vazio)_
   - **Output Directory**: _(deixar vazio ou `.`)_
3. Clique em Deploy

O arquivo `vercel.json` já inclui:

- Rewrite de SPA (todas as rotas → `index.html`)
- Headers de segurança (`X-Frame-Options`, `X-Content-Type-Options`, etc.)
- `no-cache` para o Service Worker

---

## Executar Testes

Abra no navegador:

```
tests/test-runner.html
```

Os testes são executados automaticamente sem dependências externas. Resultados ✅/❌ são exibidos na tela.

### Suítes de teste

| Arquivo                 | Testes                                  |
| ----------------------- | --------------------------------------- |
| `test-db.js`            | Helpers utilitários (datas, moeda, IDs) |
| `test-auth.js`          | Lógica de estado de autenticação        |
| `test-permissions.js`   | Controle de acesso por perfil           |
| `test-honorarios.js`    | Divisão de honorários e LIO             |
| `test-notifications.js` | Classificação de vencimentos e metas    |

---

## Estrutura de Dados (Firebase)

```
dados/
  clinica_01/
    usuarios/
      {uid}/
        nome, email, admin, permissoes{}
    metas/
      {id}/
        nome, valor
    fornecedores/
      {id}/
        nome, cnpj, categoria, contato, telefone, email
    estoque/
      {id}/
        nome, categoria, quantidade, estoque_minimo, unidade
    movimentacoes_estoque/
      {id}/
        item_id, tipo, quantidade, data, observacao
    patrimonio/
      {id}/
        nome, categoria, fornecedor, data_vencimento, valor
    {YYYY-MM-DD}/
      recepcao/
        {id}/
          paciente, origem, convenio, indicador, registrado_por, criado_em
      callcenter/
        {id}/
          paciente, telefone, atendeu, reagendou, data_reagendamento, atendente
      cirurgias/
        {id}/
          paciente, nome_cirurgiao, tipo_cirurgia, olho_operado, tem_lio,
          valor_lio_total, honorarios_lancados
      honorarios/
        {id}/
          paciente, nome_cirurgiao, nome_auxiliar, tipo_cirurgia,
          honorario_cirurgiao_pf, lio_parte_cirurgiao, lio_parte_clinica,
          honorario_auxiliar_pf, honorario_instrumentador_pf, valor_clinica_cnpj,
          lancado, valor_total
    auditoria/
      {id}/
        acao, modulo, registro_id, uid, usuario_nome, timestamp
```

---

## LGPD — Proteção de Dados

Este sistema implementa os seguintes controles de conformidade com a Lei nº 13.709/2018:

- **Art. 6º** — Dados coletados apenas para finalidades legítimas e necessárias
- **Art. 18** — Função de exclusão de conta (`excluirContaUsuario`) que remove todos os dados do usuário
- **Auditoria** — Registro de todas as operações CRUD com timestamp, módulo e usuário
- **Acesso mínimo** — Usuários veem apenas seus próprios registros (filtro por `registrado_por`)
- **Política de Privacidade** — Disponível em `/politica-privacidade.html`
- **Transmissão segura** — HTTPS obrigatório via Vercel

---

## Variáveis de Ambiente

Não há variáveis de ambiente de servidor. As configurações ficam em `firebase-config.js`.

> ⚠️ **Segurança**: O arquivo `firebase-config.js` contém chaves públicas do Firebase. Isso é esperado e seguro — a segurança real é garantida pelas **Regras do Realtime Database** no console Firebase.

---

## PWA

O sistema funciona como Progressive Web App com:

- `manifest.json` para instalação
- `service-worker.js` com estratégias Cache First (estáticos) e Network First (dados Firebase)
- Ícones necessários: `icons/icon-192.png` e `icons/icon-512.png`

---

## Licença

Uso interno da clínica. Todos os direitos reservados.
