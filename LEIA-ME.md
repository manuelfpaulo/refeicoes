# ACIPOL Refeitório: versão revista

Faça os passos pela ordem indicada. Os passos 1 e 2 são do servidor (Google), o passo 3 é do site (Vercel).

## 1. Servidor (Apps Script)

1. Abra a folha de cálculo e vá a **Extensões > Apps Script**.
2. Apague o conteúdo de `Code.js`, cole o novo `Code.js` e guarde.
3. Volte à folha e recarregue a página. Aparece o menu **Refeitório**.
4. **Reponha já a senha de `zequinho`** (e, de preferência, de todos): **Refeitório > Criar ou repor utilizador**. A senha antiga dessa conta estava escrita no código antigo. As outras contas continuam a entrar com a senha actual e passam sozinhas para o formato novo no primeiro login.
5. Se o Google pedir autorização, aceite.

## 2. Publicar a nova versão

"Implantação" é a publicação do script como serviço que as páginas chamam. Não crie uma nova: **actualize a existente**, para o endereço não mudar.

1. No Apps Script: **Implementar > Gerir implantações**.
2. Clique no lápis da implantação existente, em **Versão** escolha **Nova versão** e clique em **Implementar**.
3. Confirme estas duas definições (devem ficar assim):
   - **Executar como: Eu.** O script usa a sua permissão para ler e escrever na folha. Os utilizadores das páginas não precisam de conta Google.
   - **Quem tem acesso: Qualquer pessoa.** As páginas não pedem login Google. A segurança passa a ser feita pelas sessões do próprio sistema.

## 3. Site (Vercel)

Substitua estes ficheiros na pasta do projecto e faça o deploy:

`index.html`, `painel.html`, `inscricao.js`, `painel.js`, `sw.js`, `manifest-formulario.json`, `manifest-painel.json` e **`vercel.json`** (novo, na raiz).

Depois, quem usa o painel tem de entrar outra vez. Feche e volte a abrir as aplicações instaladas.

## 4. Na folha de cálculo

- **Matriculas, coluna B (recomendado):** escreva o nome oficial de cada cadete ao lado do NURI. Com a coluna preenchida, a inscrição só é aceite se o nome digitado coincidir com o oficial (basta nome e apelido). Com a coluna vazia, o sistema aceita qualquer nome, como antes.
- **Matriculas:** apague os 2 NURI repetidos.
- **Config:** pode apagar a linha `FeriadoPeriodoKey`, já não é usada.
- **Auditoria:** a folha é criada sozinha. Guarda logins, marcações, reversões, feriados e exportações de PDF durante 90 dias.
- **Protecção:** em **Dados > Proteger folhas e intervalos**, proteja `Usuarios`, `Config` e `Auditoria`, e limite quem pode editar o ficheiro.

## 5. Teste de 10 minutos

1. Abra `painel.html` sem entrar: nada de dados deve aparecer.
2. Entre com uma conta de cozinha e marque uma refeição aberta.
3. Tente 6 vezes uma senha errada: a conta deve bloquear.
4. Inscreva um cadete de teste e confirme que a coluna **Ano** aparece no painel e no PDF do chefe.
5. Como admin, registe um feriado e desfaça uma marcação. Confirme a linha na folha `Auditoria`.

## O que mudou

**Segurança:** o painel e a lista pública deixaram de mostrar dados sem login. As senhas já não ficam no telemóvel (há sessão de 6 horas). Bloqueio de 15 minutos após 5 falhas. Nomes e textos validados e escapados. Operações protegidas contra pedidos simultâneos. Erros internos já não chegam ao ecrã. Perfis com lista fechada: `admin`, `responsavel`, `cozinheiro`, `chefe`. Cabeçalhos de segurança no Vercel (os scripts passaram para ficheiros `.js`, por isso qualquer script novo tem de ser um ficheiro).

**Erros corrigidos:** coluna Ano; limpeza que apagava o fim de semana num domingo antes de feriado de segunda-feira (reproduzido e corrigido); o botão "desfazer" só aparece onde há marcação; o botão de enviar já não duplica pedidos.

**Limpeza:** comentários de histórico e de instrução removidos, código sem uso retirado, português uniforme ("utilizador"), erros de ortografia e de CSS corrigidos.

## Pontos a ter em conta

- **Feriado à segunda-feira:** assumi que as refeições desse dia são dos inscritos do fim de semana que acabou, e que a véspera (domingo) também. Se a regra for outra, diga-me.
- **Bloqueios:** quem errar 5 vezes fica 15 minutos sem entrar. Se muitos NURI inválidos forem tentados (60 em 10 minutos), o formulário pausa alguns minutos para todos.
- **Segredo do servidor:** o sistema cria sozinho um segredo nas propriedades do script (`PEPPER`). Não o apague. Se se perder, reponha as senhas pelo menu.
- **Feriados escritos à mão na folha** demoram até 5 minutos a aparecer.
- **Não testado em produção:** testei a lógica com um simulador (41 verificações passaram), mas não no Apps Script real nem no Vercel. Se o login demorar mais de 3 segundos, diminua `ITERACOES_HASH` para 300 no topo do `Code.js`.
