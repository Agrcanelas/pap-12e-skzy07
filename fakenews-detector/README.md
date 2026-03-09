# VeriFact — Detector de Fake News
### Projeto PAP

---

## 📁 Estrutura do Projeto

```
fakenews-detector/
├── index.html              → Página principal (notícias em destaque)
├── pages/
│   ├── scan.html           → Verificador de notícias (texto + URL)
│   ├── login.html          → Página de login
│   └── register.html       → Página de registo
├── css/
│   ├── global.css          → Estilos globais + navbar + footer
│   ├── home.css            → Estilos da página principal
│   ├── scan.css            → Estilos do verificador + resultados
│   └── auth.css            → Estilos login/registo
├── js/
│   ├── i18n.js             → Traduções (PT/EN/ES/FR)
│   ├── theme.js            → Modo escuro/claro + toasts
│   ├── home.js             → Notícias em destaque
│   ├── scan.js             → Lógica de verificação + PDF
│   └── auth.js             → Login/registo
└── README.md
```

---

## 🚀 Como usar

### Opção 1 — Abrir localmente (sem servidor)
Basta abrir o ficheiro `index.html` num browser moderno (Chrome, Firefox, Edge).

> **Nota:** Para a funcionalidade de verificação de URLs (buscar conteúdo externo), pode ser necessário um servidor local por questões de CORS.

### Opção 2 — Com servidor local (recomendado)
```bash
# Com Python 3
cd fakenews-detector
python3 -m http.server 8080
# Abre: http://localhost:8080

# Com Node.js (npx)
npx serve .
```

### Opção 3 — Deploy gratuito
- **Netlify**: Arrasta a pasta para netlify.com/drop
- **GitHub Pages**: Faz push para um repo e ativa GitHub Pages
- **Vercel**: `vercel --prod` na pasta

---

## 🤖 API de IA — Hugging Face (gratuita)

O projeto usa a **Hugging Face Inference API** que é **completamente gratuita**.

### Modelos usados:
| Modelo | Função | Link |
|--------|--------|------|
| `cardiffnlp/twitter-roberta-base-sentiment-latest` | Análise de sentimento | [HF](https://huggingface.co/cardiffnlp/twitter-roberta-base-sentiment-latest) |
| `facebook/bart-large-mnli` | Classificação zero-shot | [HF](https://huggingface.co/facebook/bart-large-mnli) |
| `mrm8488/bert-tiny-finetuned-fake-news-detection` | Deteção de fake news | [HF](https://huggingface.co/mrm8488/bert-tiny-finetuned-fake-news-detection) |

### Aumentar limites (opcional):
1. Cria conta gratuita em https://huggingface.co
2. Vai a Settings → Access Tokens → New token (leitura)
3. Copia o token e coloca em `js/scan.js`:
```javascript
const HF_KEY = 'hf_xxxxxxxxxxxxxxxxxxxxxxxxx';
```

---

## ✨ Funcionalidades

| Funcionalidade | Estado |
|---------------|--------|
| Verificação por texto | ✅ |
| Verificação por URL | ✅ |
| Barra de progresso animada (6 etapas) | ✅ |
| Relatório PDF para download | ✅ |
| Modo escuro/claro | ✅ |
| Tradução (PT/EN/ES/FR) | ✅ |
| Login/Registo de utilizadores | ✅ |
| Notícias em destaque | ✅ |
| Design responsivo (mobile) | ✅ |
| API Hugging Face gratuita | ✅ |

---

## 🎨 Design

- **Tema**: Futurista / Tech dark com acentos verde-néon
- **Fontes**: Bebas Neue (títulos) + Space Grotesk (corpo) + JetBrains Mono (código)
- **Cores principais**: `#00f5a0` (verde) + `#00d4ff` (ciano) + `#ff3366` (vermelho fake)
- **Modo claro/escuro**: Toggle no navbar, guardado em localStorage

---

## 📊 Como funciona a análise

1. **Obter conteúdo** — Texto ou fetch do URL via proxy CORS gratuito
2. **Análise linguística** — Deteção de palavras sensacionalistas, maiúsculas excessivas
3. **Verificação de fontes** — Base de dados simulada + indicadores de credibilidade
4. **Análise de sentimento** — Modelo RoBERTa do Cardiff NLP
5. **Classificação zero-shot** — BART-MNLI classifica entre "misinformation/true information/propaganda"
6. **Deteção direta** — BERT treinado especificamente em fake news
7. **Veredicto final** — Pontuação combinada → FALSO / SUSPEITO / VERDADEIRO

---

## 📄 Relatório PDF

O relatório inclui:
- Veredicto e pontuação de confiança
- Barra de fiabilidade
- Resumo da análise
- Todos os indicadores
- Fontes verificadas
- Links para fact-checkers (quando fake)
- Texto analisado

---

## 👤 Sistema de contas

- Registo com nome, email e palavra-passe
- Indicador de força da palavra-passe
- Login com validação
- Sessão guardada em localStorage
- Nome do utilizador aparece no navbar

> **Nota de segurança**: Este é um projeto de demonstração. Para produção real, usar backend com bcrypt, JWT e HTTPS.

---

*Projeto PAP — 2025*
