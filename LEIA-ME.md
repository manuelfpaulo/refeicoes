# Refeições de Fim de Semana — ACIPOL

Sistema para inscrição e controlo de refeições dos cadetes residentes, usando Google Sheets + Apps Script.

## 1. Criar a planilha

Crie uma Google Sheet nova com estas abas e colunas (exatamente estes nomes, linha 1 = cabeçalho):

**Matriculas**
| Matricula |
|---|
| 2301 |
| 2302 |
| ... |

Preencha com todas as matrículas válidas dos cadetes residentes (4 dígitos numéricos).

**Importante**: se alguma matrícula começa com zero (ex.: 0032), formate a coluna A como **Texto** antes de digitar (Formatar → Número → Texto simples), senão o Google Sheets apaga o zero à esquerda.

**Inscricoes**
| PeriodoKey | Nome | Matricula | Timestamp |
|---|---|---|---|

Deixe vazia — o sistema preenche sozinho.

**Marcacoes**
| PeriodoKey | Matricula | Nome | ColunaKey | MarcadoPor | MarcadoEm |
|---|---|---|---|---|---|

Deixe vazia — o sistema preenche sozinho.

**Usuarios**
| Username | PasswordHash | Salt | NomeExibicao | Role |
|---|---|---|---|---|
| fernando | (gerado — ver abaixo) | (gerado — ver abaixo) | Cabo Fernando | responsavel |
| alfredo | (gerado — ver abaixo) | (gerado — ver abaixo) | Sargento Alfredo | admin |

Adicione uma linha por responsável/admin. **As senhas não ficam em texto simples** — para cada conta:

1. Abra o Apps Script (Extensões → Apps Script).
2. No topo do editor, na lista de funções, escolha `gerarNovoUsuario`.
3. Edite a linha `var TESTE_SENHA = "troque-esta-senha";` dentro dessa função, colocando a senha desejada para aquela conta.
4. Clique em ▶ Executar.
5. Abra "Ver" → "Registos de execução" (ou Ctrl+Enter) — vão aparecer duas linhas: `Salt` e `PasswordHash`.
6. Copie esses dois valores para as colunas Salt e PasswordHash da linha correspondente na planilha.
7. Repita para cada conta (senhas diferentes geram salts diferentes automaticamente).

**Feriados**
| Data | Nome |
|---|---|

Pode deixar vazia — o admin preenche pelo painel.

**Config**
| Chave | Valor |
|---|---|
| FeriadoPeriodoKey | |

Deixe a segunda coluna vazia inicialmente.

## 2. Instalar o Apps Script

1. Na planilha: Extensões → Apps Script.
2. Apague o conteúdo padrão e cole o conteúdo de `Code.gs`.
3. Guarde (ícone de disquete).
4. Implantar → Nova implantação → tipo "Aplicação Web".
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
5. Copie o URL gerado (algo como `https://script.google.com/macros/s/.../exec`).

## 3. Configurar as páginas

Em `formulario.html` e em `painel.html`, substitua:

```js
var SCRIPT_URL = "COLE_AQUI_O_URL_DO_APPS_SCRIPT";
```

pelo URL copiado no passo anterior, em ambos os ficheiros.

## 4. Publicar

Suba `formulario.html`, `painel.html`, `favicon.png` e `foto-acipol.jpg` para o GitHub Pages (mesmo esquema já usado no Plano de Férias), ou qualquer hospedagem estática — os quatro arquivos precisam estar na mesma pasta, pois as páginas referenciam as imagens pelo nome direto. Não precisam de servidor próprio — toda a lógica roda no Apps Script.

- **Link do formulário** (`formulario.html`): partilhe com os cadetes residentes.
- **Link do painel** (`painel.html`): só para os responsáveis da cozinha e o admin.

## Como funciona por trás

- **Período**: cada fim de semana tem uma "PeriodoKey" (a data da sexta-feira de referência). Isso separa naturalmente os dados de uma semana para outra — não é preciso apagar nada; a lista "zera" sozinha porque só mostramos os registos do período atual.
- **Horários**: definidos em `MEAL_DEFS` dentro do `Code.gs`. Se algum horário mudar, é só ajustar ali.
- **Feriado**: o admin ativa manualmente pelo painel a cada fim de semana que tiver feriado — o sistema não detecta sozinho.
- **Auditoria**: cada marcação grava quem marcou e quando; o admin pode reverter (isso apaga a linha em "Marcacoes").
- **Senhas**: guardadas como hash SHA-256 com um salt único por utilizador, nunca em texto simples. Ninguém com acesso à planilha consegue ler a senha original.
- **Atualização automática**: as duas páginas consultam o servidor sozinhas a cada alguns segundos (formulário: 10s: painel: 6s) — não precisa recarregar a página.

## Limitação conhecida

Sem servidor dedicado, o "tempo real" é por consulta periódica (polling), não instantâneo. Para o volume de uso esperado (poucos cadetes, um responsável de cada vez), isso não deve ser perceptível.
