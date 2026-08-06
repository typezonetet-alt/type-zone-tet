# T&T Cursos — Briefing Mestre de Produto e Desenvolvimento

**Plataforma Online de Digitação, Aprendizagem, Jogos e Competições**

Documento único para Produto, UX, UI, Frontend, Backend, QA e DevOps.

Versão 1.0 | Agosto de 2026

## 0. Como usar este documento

Este documento é a especificação mestre para transformar a ideia da T&T Cursos em uma aplicação web de digitação completa, leve, competitiva e mensurável. Ele foi escrito para reduzir ambiguidades entre negócio, design e desenvolvimento. Quando houver conflito entre uma ideia visual e a regra pedagógica, a regra pedagógica e a integridade da medição devem prevalecer.
O produto não deve ser tratado como uma coleção de minijogos. O núcleo é um motor de aprendizagem de digitação tátil, com jogos funcionando como camadas de prática, motivação e competição. Essa decisão evita o principal risco do projeto, criar algo divertido que não melhora a técnica.

### Decisões que o desenvolvedor pode considerar aprovadas

- Aplicação web responsiva, priorizando desktop e notebook, porque a habilidade principal exige teclado físico.
- Interface em português do Brasil na primeira versão.
- Layout de teclado ABNT2 como padrão inicial, com arquitetura preparada para outros layouts.
- Login de aluno por código e senha, com nome e turma vinculados pelo administrador.
- Salas ao vivo com código temporário, lobby, início pelo anfitrião, ranking e pódio.
- Progressão pedagógica estruturada, exercícios adaptativos, testes, jogos, ligas e competições mensais.
- Desempenho deve ser prioridade. Jogos 2D leves, vetores, sprites e áudio comprimido. Evitar 3D pesado.
- Administrador controla usuários, turmas, conteúdo, níveis, metas, competições, permissões e relatórios.

### Fora de escopo inicial

- Aplicativo nativo para celular.
- Marketplace aberto ao público.
- Chat livre entre alunos.
- Compras com dinheiro real dentro dos jogos.
- Ambientes tridimensionais pesados.
- Dependência de inteligência artificial para funções essenciais.


## 1. Resumo executivo

Nome de trabalho: T&T Digita. O nome é provisório e deve ser configurável no produto para permitir eventual mudança de marca sem alteração estrutural.
T&T Digita será uma plataforma online para ensinar, treinar, medir e gamificar digitação. O aluno aprende técnica correta, pratica por uma trilha progressiva, recebe exercícios personalizados segundo seus erros, participa de jogos e compete em salas ao vivo, rankings de turma, ligas e temporadas mensais.
O professor transforma a aula de informática em uma experiência mensurável. Ele acompanha velocidade, precisão, evolução, teclas problemáticas, tempo de prática e desempenho por exercício. O administrador controla a operação completa.
O produto deve conseguir atender dois extremos. Um iniciante que ainda procura as teclas no teclado, e um digitador de elite buscando desempenho acima de 150 palavras por minuto. A plataforma não deve impor um teto artificial de velocidade.

### Proposta de valor

Aprender a digitar corretamente, evoluir com dados reais e competir sem transformar velocidade em atalho para técnica ruim.

### Princípios do produto


| Princípio | Aplicação prática |
| --- | --- |
| Precisão antes de velocidade | Progressão exige precisão mínima. Velocidade isolada não libera níveis avançados. |
| Treino deliberado | O sistema identifica fraquezas e direciona exercícios. |
| Diversão com propósito | Cada jogo deve treinar uma habilidade definida. |
| Competição justa | Ranking usa métricas normalizadas e regras anti abuso. |
| Feedback imediato | O aluno entende erro, acerto, ritmo e evolução durante e após a sessão. |
| Leveza | A aplicação deve funcionar bem em laboratórios com máquinas modestas. |
| Controle pedagógico | Professor e administrador podem definir metas, liberar conteúdo e acompanhar resultados. |



## 2. Benchmark e referências

A pesquisa de referência considera Ratatype, AgileFingers, Typing.com, TypingClub e edclub, Kahoot, Duolingo, Monkeytype e ZType. A intenção não é copiar interfaces ou ativos, mas identificar padrões de produto que já provaram valor.

| Referência | O que aproveitar | O que evitar |
| --- | --- | --- |
| Ratatype Ratashooter | Palavras em movimento, dificuldade progressiva, bônus, personagens, feedback imediato e equilíbrio entre velocidade e precisão. | Fazer o jogo ser o curso inteiro. |
| AgileFingers | Lições por grupos de teclas, teclado virtual, prática de palavras, textos e jogos com objetivos distintos. | Separar demais treino e motivação. |
| Typing.com | Currículo gamificado, conteúdo adaptativo, gestão de turmas, testes, lições personalizadas e relatórios. | Excesso de elementos que desviem do exercício. |
| TypingClub | Progressão guiada, visualização de dedos, repetição e domínio gradual. | Dependência excessiva de animação em todas as telas. |
| Kahoot | Entrada por código temporário, lobby, controle do anfitrião, ranking intermediário e pódio. | Competição baseada apenas em rapidez. |
| Duolingo | XP, sequência, ligas, missões, temporadas e progressão visual. | Mecânicas que incentivem uso compulsivo ou punições desproporcionais. |
| Monkeytype | Tela limpa, métricas avançadas, modos por tempo e quantidade, foco em usuários de alto desempenho. | Interface técnica demais para iniciantes. |
| ZType | Ação direta ligada à palavra digitada e aumento contínuo de pressão. | Visual ou efeitos que comprometam legibilidade. |

O Ratashooter confirma uma mecânica útil para este projeto: palavras podem se aproximar do personagem em velocidades e trajetórias diferentes, com bônus por palavras perfeitas. O AgileFingers reforça que jogos funcionam melhor como prática complementar a lições estruturadas. O Typing.com demonstra o valor de currículo, gestão de classes e relatórios. O Kahoot valida o padrão de sala temporária com PIN, lobby, ranking e pódio.

### Conclusão do benchmark

O produto ideal não é uma cópia de uma referência. Ele combina o rigor de uma plataforma educacional, a clareza de um teste profissional, a motivação de uma trilha gamificada e a energia de uma competição ao vivo.


## 3. Públicos e papéis


| Papel | Objetivo principal | Permissões resumidas |
| --- | --- | --- |
| Aluno | Aprender, treinar, jogar, competir e acompanhar evolução. | Acessa conteúdo liberado, perfil, rankings e salas. |
| Professor | Conduzir turma e acompanhar aprendizagem. | Visualiza turmas atribuídas, cria tarefas e salas, consulta relatórios. |
| Administrador | Operar toda a plataforma. | Gerencia usuários, turmas, conteúdo, níveis, competições, configurações e dados. |
| Superadministrador | Manutenção técnica e governança. | Configura instâncias, permissões globais, auditoria e suporte. |


### Persona aluno iniciante

Aluno com pouca memória muscular, olha frequentemente para o teclado, usa poucos dedos e alterna velocidade de forma irregular. Precisa de instruções visuais simples, repetição curta, metas alcançáveis e correção de técnica.

### Persona aluno intermediário

Já digita sem olhar na maior parte do tempo, mas apresenta erros em combinações específicas, acentos, maiúsculas, números e símbolos. Precisa de treino adaptativo, textos naturais e desafios.

### Persona aluno avançado

Busca velocidade, consistência e precisão em condições variadas. Precisa de modos configuráveis, métricas detalhadas, textos longos, números, símbolos, programação e competições.

### Persona professor

Precisa abrir uma turma, enxergar rapidamente quem evoluiu, quem está parado, quais habilidades estão fracas e iniciar uma competição sem configuração complexa.


## 4. Arquitetura de experiência

A navegação do aluno deve ser organizada em cinco destinos principais.

| Destino | Função |
| --- | --- |
| Aprender | Trilha pedagógica sequencial. |
| Treinar | Prática livre e adaptativa. |
| Jogar | Minijogos com objetivo pedagógico. |
| Competir | Salas ao vivo, desafios e campeonatos. |
| Perfil | Estatísticas, conquistas, liga, histórico e personalização. |


### Tela inicial do aluno

- Saudação e avatar.
- Botão grande Continuar treino.
- Meta diária e progresso.
- Sequência de dias de prática, sem punição agressiva por perda.
- Liga atual e posição.
- Próxima missão.
- Atalho para entrar em sala por código.
- Resumo de velocidade e precisão dos últimos sete dias.
- Evento ou competição mensal ativa.

### Navegação do professor

- Visão geral
- Turmas
- Alunos
- Atividades
- Salas ao vivo
- Competições
- Relatórios
- Biblioteca de conteúdo

### Navegação do administrador

- Dashboard
- Usuários
- Turmas
- Professores
- Conteúdo
- Trilha e níveis
- Jogos
- Competições
- Rankings
- Relatórios
- Configurações
- Auditoria


## 5. Autenticação e usuários


### Aluno

O login padrão do aluno usa código único e senha. O código deve ser fácil de digitar, mas não previsível. O administrador pode gerar automaticamente ou definir manualmente, desde que seja único.

| Campo | Regra |
| --- | --- |
| Nome | Obrigatório. |
| Código | Único, normalizado, não sensível a espaços acidentais nas extremidades. |
| Senha | Armazenada somente como hash forte. Nunca salvar texto puro. |
| Turma | Obrigatória na criação comum, editável pelo administrador. |
| Status | Ativo, suspenso ou arquivado. |
| Avatar | Opcional e selecionado em catálogo seguro. |
| Data de criação | Automática. |
| Último acesso | Automático. |


### Fluxo de login

1. Aluno informa código.
2. Aluno informa senha.
3. Servidor valida credenciais.
4. Sessão segura é criada.
5. Sistema carrega permissões, turma, progresso e configurações.
6. Aluno é direcionado ao painel.

### Recuperação

Aluno não deve recuperar senha por email se a conta não possuir email. Professor ou administrador pode gerar senha temporária e exigir troca no próximo acesso.

### Segurança

- Limitar tentativas repetidas de login.
- Registrar eventos de autenticação relevantes.
- Invalidar sessões após redefinição de senha quando necessário.
- Aplicar proteção contra requisições maliciosas, injeção, scripts e falsificação de sessão.
- Não expor dados de outras turmas para alunos.
- Aplicar controle de acesso no backend, nunca apenas escondendo botões no frontend.


## 6. Cadastro e gestão de turmas


### Cadastro individual

Administrador informa nome, turma, código e senha inicial. O sistema valida duplicidade e confirma a criação.

### Cadastro em lote

Importação por planilha com pré visualização antes de confirmar. Colunas mínimas: nome, turma, código opcional e senha opcional. Se código ou senha não forem fornecidos, o sistema gera.

### Turmas

- Nome da turma.
- Curso.
- Turno.
- Professor responsável.
- Data de início e fim.
- Status.
- Metas padrão de velocidade e precisão.
- Trilha atribuída.
- Jogos permitidos.
- Competição mensal habilitada ou desabilitada.

### Arquivamento

Excluir aluno deve ser exceção. Preferir arquivamento para preservar histórico, certificados e relatórios. Exclusão definitiva exige permissão elevada e confirmação.


## 7. Motor pedagógico

O motor pedagógico é o coração do produto. Ele define quais teclas o aluno pode praticar, quais combinações aparecem, quais metas liberam a próxima etapa e como o sistema reage aos erros.

### Ordem recomendada


| Etapa | Conteúdo | Objetivo |
| --- | --- | --- |
| Fundação | Postura, posição das mãos, linha guia e teclas F e J. | Criar referência tátil. |
| Linha guia | A S D F, J K L Ç e combinações. | Memória muscular central. |
| Extensões próximas | G H e combinações. | Movimento lateral controlado. |
| Linha superior | E I, R U, T Y, W O, Q P. | Alcance vertical. |
| Linha inferior | C M, V N, X vírgula, Z ponto, B. | Alcance inferior. |
| Maiúsculas | Shift alternado com mão oposta. | Coordenação bilateral. |
| Acentuação | Agudo, circunflexo, til e cedilha conforme ABNT2. | Português real. |
| Números | Linha numérica e sequências. | Entrada de dados. |
| Símbolos | Pontuação e símbolos frequentes. | Fluência completa. |
| Palavras | Frequência crescente e vocabulário natural. | Automatização. |
| Frases | Pontuação e maiúsculas. | Ritmo. |
| Textos | Parágrafos e conteúdo natural. | Resistência e consistência. |
| Profissional | CPF, CNPJ, datas, telefones, emails, endereços, códigos e dados tabulares. | Aplicação prática. |
| Elite | Textos longos, símbolos, números, programação e testes de alta velocidade. | Desempenho sem teto artificial. |



## 8. Estrutura de níveis

Recomenda se uma trilha principal com 12 mundos e 120 níveis iniciais. O administrador deve poder editar metas, bloquear, reordenar ou criar trilhas alternativas.

| Mundo | Foco |
| --- | --- |
| Mundo 1, Base | Postura, F, J e linha guia |
| Mundo 2, Controle | Linha guia completa |
| Mundo 3, Alcance Superior | Linha superior |
| Mundo 4, Alcance Inferior | Linha inferior |
| Mundo 5, Coordenação | Shift, maiúsculas e alternância |
| Mundo 6, Português | Acentos, cedilha e pontuação |
| Mundo 7, Fluência | Palavras frequentes |
| Mundo 8, Ritmo | Frases e parágrafos |
| Mundo 9, Dados | Números e dados profissionais |
| Mundo 10, Precisão | Treinos de erro zero |
| Mundo 11, Velocidade | Sprints e consistência |
| Mundo 12, Elite | Testes avançados e conteúdo aberto |


### Regra de desbloqueio

Cada nível possui precisão mínima, velocidade alvo opcional, número máximo de erros e quantidade de tentativas recomendada. A precisão deve ter peso superior à velocidade nos níveis iniciais. O administrador pode escolher entre desbloqueio rígido, desbloqueio recomendado ou trilha livre.

### Domínio

- Bronze: concluiu.
- Prata: atingiu precisão alvo.
- Ouro: atingiu precisão e velocidade alvo.
- Diamante: superou meta avançada com consistência.


## 9. Exercícios fundamentais


| Tipo | Exemplo | Habilidade |
| --- | --- | --- |
| Repetição de tecla | ffff jjjj | Memória de posição |
| Alternância | fj fj jf jf | Coordenação |
| Combinação | asdf jklç | Linha guia |
| Bigrama | de, er, ar, os | Transições frequentes |
| Trigrama | que, ent, com | Fluência |
| Palavras | casa, tempo, trabalho | Automatização |
| Frases | Frases curtas com pontuação. | Ritmo e Shift |
| Parágrafos | Textos naturais. | Resistência |
| Números | Datas, valores e sequências. | Entrada de dados |
| Dados profissionais | CPF, CNPJ, telefone, CEP, email. | Aplicação prática |
| Ditado | Áudio curto para transcrição. | Escuta e produção |
| Cópia visual | Texto em bloco. | Velocidade e precisão |
| Símbolos | Parênteses, colchetes, operadores. | Teclado completo |
| Programação | Padrões de código sem conteúdo executável. | Símbolos e precisão |
| Correção focada | Conteúdo criado a partir dos erros. | Remediação |


### Gerador de exercícios

O conteúdo deve ser gerado a partir de um banco curado de palavras e padrões, respeitando as teclas já liberadas. O sistema não deve apresentar uma palavra com tecla ainda não ensinada em exercícios de aprendizagem, salvo quando a atividade declarar explicitamente que é revisão ou teste.


## 10. Técnica de dedos e teclado visual

As telas iniciais devem seguir a referência visual enviada pelo cliente: teclado grande, mãos simplificadas, tecla alvo destacada e indicação clara do dedo correto. A representação pode ser vetorial e não precisa reproduzir mãos realistas.

### Regras

- Destacar tecla alvo.
- Destacar dedo correspondente.
- Mostrar tecla F e J como âncoras.
- Permitir ocultar mãos após domínio.
- Permitir ocultar teclado virtual em níveis avançados.
- Não aceitar clique na tecla virtual como substituto da digitação física no modo padrão.
- Exibir instrução curta antes da primeira tentativa de uma nova tecla.

### Mapa de dedos


| Dedo | Teclas base ABNT2 |
| --- | --- |
| Mindinho esquerdo | A, Q, Z e teclas periféricas relacionadas |
| Anelar esquerdo | S, W, X |
| Médio esquerdo | D, E, C |
| Indicador esquerdo | F, G, R, T, V, B |
| Indicador direito | J, H, U, Y, M, N |
| Médio direito | K, I, vírgula |
| Anelar direito | L, O, ponto |
| Mindinho direito | Ç, P e teclas periféricas relacionadas |
| Polegares | Espaço |



## 11. Métricas de digitação


| Métrica | Definição funcional |
| --- | --- |
| WPM bruto | Caracteres digitados divididos por cinco e pelo tempo em minutos, antes de penalidades. |
| WPM líquido | Velocidade após regra de erros definida pelo modo. |
| CPM | Caracteres por minuto. |
| Precisão | Entradas corretas divididas pelo total de entradas relevantes. |
| Erros | Quantidade de entradas incorretas. |
| Correções | Uso de Backspace ou correção conforme modo. |
| Consistência | Variação do ritmo ao longo do teste. |
| Tempo ativo | Tempo efetivamente digitando. |
| Tempo de reação | Intervalo até início de palavra ou estímulo. |
| Teclas fracas | Teclas com erro ou latência acima da média pessoal. |
| Bigrama fraco | Transição entre duas teclas com baixa eficiência. |
| Sequência perfeita | Trecho concluído sem erro. |


### Regras de integridade

Cada resultado deve armazenar a versão da fórmula utilizada. Isso permite alterar fórmulas futuras sem invalidar histórico. Rankings oficiais devem usar uma fórmula congelada por temporada.

### Precisão como barreira

Em competições oficiais, resultados abaixo da precisão mínima configurada não devem vencer apenas por velocidade. Sugestão padrão: 95 por cento para níveis intermediários e 97 por cento para categorias avançadas, editável pelo administrador.


## 12. Motor adaptativo

Após cada sessão, o sistema atualiza um perfil de habilidade. O objetivo é escolher exercícios que ataquem fraquezas sem transformar toda sessão em repetição frustrante.

### Sinais

- Taxa de erro por tecla.
- Latência por tecla.
- Erro por bigrama e trigrama.
- Uso de Backspace.
- Queda de precisão ao aumentar velocidade.
- Pausas longas.
- Desempenho por tipo de conteúdo.
- Desempenho recente com maior peso que desempenho antigo.

### Composição recomendada de uma sessão adaptativa


| Bloco | Percentual inicial |
| --- | --- |
| Revisão dominada | 20 por cento |
| Fraquezas principais | 40 por cento |
| Conteúdo do nível atual | 30 por cento |
| Desafio acima do nível | 10 por cento |

Esses percentuais são configuração inicial, não regra fixa. O motor deve poder ser ajustado sem deploy.

### Critério de fraqueza

Uma tecla pode ser marcada como fraca quando sua precisão recente estiver significativamente abaixo da média do aluno ou quando sua latência estiver persistentemente alta. Não usar apenas um erro isolado.


## 13. Modo Tradicional

Modo central de aprendizagem. Texto ou sequência aparece em linha ou bloco, com cursor indicando a posição atual.

### Configurações

- Por número de palavras.
- Por número de caracteres.
- Por duração.
- Permitir ou bloquear Backspace.
- Pontuação ligada ou desligada.
- Maiúsculas ligadas ou desligadas.
- Números e símbolos.
- Teclado virtual visível ou oculto.
- Mãos visíveis ou ocultas.
- Som de erro opcional.

### Feedback

Caractere correto recebe feedback discreto. Erro recebe indicação clara, sem deslocar o texto. A interface nunca deve piscar excessivamente. Ao final, mostrar WPM, precisão, erros, consistência, teclas problemáticas e comparação com a média pessoal.


## 14. Modo Sprint

Teste curto para velocidade. Presets de 15, 30, 60, 120, 300 e 600 segundos, além de duração personalizada quando permitido.

### Objetivo

Medir velocidade sustentável em janelas diferentes. Resultados de 15 segundos não devem ser comparados diretamente com resultados de 10 minutos no mesmo ranking.

### Ranking

Cada duração possui ranking próprio ou categoria normalizada. Para ranking oficial, exigir quantidade mínima de caracteres e precisão mínima.


## 15. Jogo T&T Orbital

Nome sugerido para o jogo inspirado em ZType e shooters de palavras. Elementos entram pela parte superior e avançam em direção à base do jogador. Cada elemento carrega uma palavra.

### Mecânica

1. Palavras surgem em posições variadas.
2. Ao digitar a primeira letra de uma palavra disponível, ela pode receber foco.
3. Cada caractere correto produz feedback visual.
4. Ao completar a palavra, o alvo é removido e o jogador recebe pontos.
5. Erros quebram combo ou reduzem multiplicador conforme dificuldade.
6. A velocidade de aproximação cresce progressivamente.
7. Palavras mais difíceis valem mais.

### Habilidade treinada

Reconhecimento rápido de palavras, precisão sob pressão e troca de foco.

### Performance

Usar sprites leves ou Canvas 2D. Limitar partículas. Permitir modo de efeitos reduzidos.


## 16. Jogo T&T Turbo

Corrida competitiva inspirada em jogos de corrida de digitação. Cada aluno controla um personagem ou veículo. O avanço é proporcional à digitação válida.

### Mecânica justa

A posição visual não deve responder apenas ao WPM bruto. O servidor calcula progresso usando caracteres corretos, precisão e objetivo da rodada. Erros podem reduzir aceleração temporariamente, sem criar punição exagerada.

### Sala ao vivo

Em uma turma, todos recebem conteúdo equivalente. O servidor é autoridade sobre tempo e placar. O cliente apenas envia eventos necessários e renderiza a corrida.

### Visual

Personagens simples e carismáticos, pista limpa, nomes curtos e posição. A referência enviada com corrida de personagens é adequada para direção visual, mas a T&T deve ter identidade própria.


## 17. Jogo T&T Robô

Plataforma 2D em que palavras corretas acionam ações do personagem, como andar, pular, ativar portas ou neutralizar obstáculos. Inspirado conceitualmente em jogos educacionais de plataforma, sem copiar personagens, mapas ou arte.

### Regra pedagógica

A ação deve depender de digitação, não de controles paralelos complexos. Se o aluno passar mais tempo jogando com setas do que digitando, o jogo falhou como exercício.

### Fases

- Letras individuais para iniciantes.
- Palavras curtas.
- Palavras longas.
- Acentuação.
- Números.
- Mistura avançada.


## 18. Jogo Chuva de Palavras

Palavras descem em velocidades diferentes. O aluno precisa concluí las antes de alcançarem a zona inferior.

### Modos

- Relaxado, poucas palavras e velocidade baixa.
- Normal, densidade crescente.
- Sobrevivência, três vidas.
- Precisão, qualquer erro reduz pontuação.
- Elite, palavras longas, símbolos e maior densidade.

### Prioridade pedagógica

O sistema pode selecionar palavras contendo teclas fracas do aluno. Assim, a pressão do jogo é usada para consolidar uma habilidade específica.


## 19. Jogo Defesa T&T

O jogador protege uma base. Cada ameaça possui palavra ou sequência. Completar o texto remove a ameaça. Rodadas aumentam dificuldade.

### Power ups

Bônus devem ser obtidos por desempenho, não por compra. Exemplos: congelar temporariamente o movimento, multiplicar pontos por precisão, limpar alvos simples e recuperar uma vida em modos que utilizem vidas.

### Boss

Chefes podem usar frases ou sequências maiores divididas em etapas. A interface deve preservar legibilidade e não usar efeitos que escondam o texto.


## 20. Jogo Ritmo

Palavras ou sequências aparecem em cadência. O objetivo é manter ritmo estável. O jogo premia consistência, não apenas pico de velocidade.

### Uso pedagógico

Excelente para alunos que digitam em rajadas, aceleram demais e acumulam erros. O sistema pode ajustar o intervalo de estímulo ao desempenho.


## 21. Modo Precisão Absoluta

Exercício para formar disciplina. A meta é completar conteúdo com precisão configurável, inclusive 100 por cento em desafios específicos.

### Variantes

- Sem Backspace.
- Com correção permitida.
- Erro reinicia apenas a palavra.
- Erro reinicia o trecho.
- Sequência crescente de palavras perfeitas.
Não usar reinício total em treinos longos para iniciantes, porque a punição pode superar o benefício pedagógico.


## 22. Modo Profissional

Treino voltado para tarefas reais de escritório e atendimento.

| Categoria | Conteúdo |
| --- | --- |
| Cadastros | Nomes, endereços, bairros e cidades fictícias. |
| Documentos | Sequências com formato de CPF e CNPJ geradas apenas para treino, claramente fictícias. |
| Financeiro | Valores, datas, percentuais e descrições. |
| Atendimento | Frases curtas e respostas profissionais. |
| Planilhas | Linhas de dados com separadores. |
| Email | Endereços fictícios e assuntos. |
| Secretariado | Protocolos, agendas e textos administrativos fictícios. |


### Privacidade

Nunca usar dados pessoais reais de alunos ou clientes como conteúdo de treino.


## 23. Modo Elite

Área para digitadores de alto desempenho. Deve permitir configurações avançadas sem simplificar artificialmente o teste.
- 15 segundos a 60 minutos.
- 10 a 10.000 palavras.
- Textos longos.
- Pontuação completa.
- Números.
- Símbolos.
- Conteúdo técnico.
- Modo sem correção.
- Modo com correção.
- Histograma de ritmo.
- Consistência.
- Latência por tecla.
- Comparação de sessões.

### Sem teto

Banco e frontend não devem assumir que WPM cabe em dois ou três dígitos específicos. O sistema deve aceitar desempenhos extremos e manter precisão de cálculo.


## 24. Salas ao vivo estilo competição

Professor ou administrador cria uma sessão ao vivo. O sistema gera código temporário e opcionalmente QR. Alunos autenticados podem entrar pelo código. O anfitrião controla o início.

### Fluxo

1. Professor seleciona Criar sala.
2. Escolhe modo, conteúdo, duração, dificuldade e regras.
3. Sistema gera código temporário.
4. Lobby mostra código, participantes e estado de conexão.
5. Professor inicia.
6. Servidor envia contagem regressiva sincronizada.
7. Partida começa para todos.
8. Ranking pode atualizar em tempo real ou em intervalos curtos.
9. Ao final, servidor fecha resultados.
10. Tela exibe pódio e resumo.
11. Resultados são gravados no histórico.

### Estados da sala


| Estado | Descrição |
| --- | --- |
| Criada | Configuração salva, ainda sem lobby ativo. |
| Lobby | Aceita participantes. |
| Contagem | Entrada pode ser bloqueada conforme regra. |
| Em andamento | Partida ativa. |
| Pausada | Somente se o modo permitir. |
| Finalizada | Resultados consolidados. |
| Cancelada | Sem resultado oficial. |



## 25. Regras de sala e sincronização

- Código expira após encerramento.
- Professor pode remover participante antes do início.
- Aluno reconectado dentro da tolerância retorna à sessão quando tecnicamente possível.
- Tempo oficial vem do servidor.
- Pontuação oficial é validada no servidor.
- Eventos críticos devem possuir identificador para evitar duplicidade.
- O cliente não pode declarar sozinho que venceu.
- Se a conexão cair, mostrar estado de reconexão e preservar progresso local apenas como contingência, sujeito a validação.

### Capacidade

Meta inicial recomendada: 50 participantes por sala sem degradação perceptível. Arquitetura deve permitir elevar o limite após teste de carga.

### Latência

A experiência deve tolerar redes escolares instáveis. Não transmitir cada frame do jogo. Transmitir estado essencial e eventos agregados.


## 26. Sistema de ranking


### Tipos

- Turma.
- Unidade.
- Geral T&T.
- Semanal.
- Mensal.
- Temporada.
- Por modo.
- Por duração.
- Por nível.
- Maior evolução.

### Regra de elegibilidade

Ranking competitivo deve exigir um mínimo de precisão e quantidade de conteúdo. O objetivo é impedir que digitação descontrolada gere posição alta.

### Empate

1. Maior precisão.
2. Maior WPM líquido.
3. Maior consistência.
4. Menor número de erros.
5. Tempo de conclusão, quando aplicável.

### Privacidade

Para alunos, exibir nome configurado ou apelido escolar aprovado, turma e avatar. Não expor email, telefone ou outros dados.


## 27. Ligas e temporada mensal

A competição mensal deve funcionar como camada de motivação sobre o curso, não como substituta da aprendizagem.

| Liga | Critério conceitual |
| --- | --- |
| Bronze | Entrada |
| Prata | Progressão inicial |
| Ouro | Desempenho consistente |
| Platina | Alto desempenho |
| Diamante | Desempenho avançado |
| Mestre | Elite |
| Lenda T&T | Faixa superior da temporada |


### Pontuação da liga

Usar pontos de temporada, separados do XP vitalício. Pontos são obtidos por atividades válidas, desafios e competições. Limitar ganho repetitivo em exercícios triviais para evitar farm.

### Fechamento

No fim da temporada, registrar posição, liga e premiações digitais. A nova temporada pode aplicar redução parcial de classificação, preservando histórico.


## 28. XP, níveis de conta e moedas


### XP

XP representa participação e progresso geral. Não deve ser usado sozinho para afirmar habilidade de digitação.

| Ação | XP sugerido |
| --- | --- |
| Concluir lição | 20 a 60 |
| Domínio Ouro | Bônus de 30 |
| Treino adaptativo | Até 50 por sessão elegível |
| Missão diária | 20 a 100 |
| Competição | Conforme posição e participação |
| Primeira conclusão de jogo | Bônus único |


### Moedas

Moeda virtual pode desbloquear itens cosméticos. Não vender vantagens competitivas. Não permitir compra de precisão, velocidade, vidas oficiais ou posição em ranking.

### Cosméticos

- Avatares
- Molduras
- Temas leves
- Efeitos de conclusão
- Títulos
- Mascotes visuais sem vantagem


## 29. Missões, conquistas e sequência


### Missões

- Complete duas lições.
- Treine dez minutos.
- Atinja a meta de precisão.
- Pratique uma tecla fraca.
- Participe de uma sala.
- Melhore sua média pessoal.

### Conquistas

- Primeira lição.
- Mil palavras corretas.
- Dez mil palavras corretas.
- Sete sessões em dias diferentes.
- Primeiro domínio Diamante.
- Primeira competição.
- Precisão perfeita em desafio elegível.
- Novo recorde pessoal.

### Sequência

A sequência deve premiar consistência, mas não deve usar mensagens de culpa. Uma sessão válida exige atividade mínima configurável.


## 30. Campeonato

Campeonato é diferente de sala casual. Possui inscrição, janela de realização, regras congeladas, categorias e resultado auditável.

### Formatos

- Classificatória por pontuação.
- Mata mata com confrontos.
- Final ao vivo.
- Desafio assíncrono dentro de janela definida.

### Categorias

Administrador pode separar por turma, faixa de nível, idade escolar ou categoria técnica. O sistema deve evitar colocar iniciantes contra usuários de elite quando o objetivo for competição pedagógica.

### Auditoria

Guardar configuração, versão da fórmula, conteúdo, participantes, tentativas, resultados e eventos de integridade.


## 31. Painel do aluno


| Card | Conteúdo |
| --- | --- |
| Continuar | Próxima atividade recomendada. |
| Hoje | Minutos praticados, XP e missão. |
| Meu desempenho | WPM, precisão e tendência. |
| Teclas para melhorar | Até cinco prioridades. |
| Liga | Posição e tempo restante da temporada. |
| Turma | Ranking e desafio ativo. |
| Conquistas | Últimas desbloqueadas. |
| Competir | Entrar por código. |


### Página de estatísticas

- Gráfico de WPM por data.
- Gráfico de precisão.
- Mapa de calor do teclado.
- Matriz de bigramas.
- Histórico de testes.
- Recordes por duração.
- Tempo total de prática.
- Distribuição de erros.
- Evolução por mundo.


## 32. Painel do professor


### Visão geral

- Alunos ativos hoje.
- Tempo médio de prática.
- Precisão média.
- WPM médio.
- Alunos sem atividade recente.
- Maiores evoluções.
- Principais teclas problemáticas da turma.
- Atividades pendentes.

### Página da turma


| Coluna | Uso |
| --- | --- |
| Aluno | Identificação. |
| Nível | Progresso na trilha. |
| WPM | Média recente e recorde. |
| Precisão | Média recente. |
| Tempo | Prática no período. |
| Última atividade | Acompanhamento. |
| Status | Em dia, atenção ou sem dados. |
| Ação | Abrir perfil ou atribuir treino. |


### Ações

- Criar atividade.
- Criar sala.
- Definir meta.
- Liberar jogo.
- Atribuir nível.
- Exportar relatório.
- Abrir perfil do aluno.


## 33. Painel do administrador


### Indicadores

- Alunos ativos.
- Professores ativos.
- Turmas.
- Sessões no período.
- Tempo total de prática.
- Média de precisão.
- Média de WPM.
- Competições.
- Taxa de conclusão.
- Erros técnicos relevantes.

### Gestão

- CRUD de usuários.
- CRUD de turmas.
- CRUD de trilhas.
- CRUD de exercícios.
- Configuração de jogos.
- Metas globais.
- Temporadas.
- Competições.
- Catálogo cosmético.
- Permissões.
- Auditoria.
- Exportação.


## 34. Editor de conteúdo

Administrador e, se autorizado, professor podem criar conteúdo sem alterar código.

### Tipos

- Sequência de teclas.
- Lista de palavras.
- Frases.
- Texto.
- Dados fictícios.
- Ditado com áudio.
- Desafio misto.

### Campos

- Título.
- Descrição.
- Idioma.
- Layout de teclado.
- Nível.
- Teclas permitidas.
- Conteúdo.
- Meta de precisão.
- Meta de WPM.
- Tempo ou quantidade.
- Tags.
- Status rascunho ou publicado.

### Validação

O editor deve alertar quando um exercício de nível restrito contém teclas que ainda não foram ensinadas.


## 35. Relatórios


| Relatório | Filtros | Saída |
| --- | --- | --- |
| Evolução do aluno | Período, modo | Tela, PDF futuro, CSV |
| Turma | Turma, período | Tela e CSV |
| Frequência de prática | Turma, período | Tela e CSV |
| Teclas fracas | Aluno ou turma | Tela |
| Ranking | Escopo, temporada | Tela e CSV |
| Competição | Evento | Tela e CSV |
| Conclusão de trilha | Turma | Tela e CSV |
| Auditoria | Usuário, ação, período | Tela restrita |


### Comparação

Relatórios de evolução devem comparar o aluno com ele mesmo antes de comparar com colegas. Exibir diferença absoluta e percentual quando fizer sentido.


## 36. Certificação

Certificado deve depender de critérios verificáveis. Exemplo: conclusão de trilha, teste final com precisão mínima e WPM mínimo.

### Níveis sugeridos


| Certificação | Critério configurável |
| --- | --- |
| Fundamentos | Domínio das teclas e técnica básica. |
| Intermediário | Fluência com textos e pontuação. |
| Avançado | Alta precisão, velocidade e conteúdo profissional. |
| Elite T&T | Teste avançado com consistência e precisão elevadas. |

O documento deve registrar nome, data, categoria, resultado e código de verificação quando a função de certificado for implementada.


## 37. Design system


### Direção visual

A interface deve combinar energia de jogo com clareza educacional. Usar bastante espaço, cards arredondados, tipografia legível, cores T&T e ilustrações próprias. As referências enviadas mostram três padrões úteis: jogo em tela central com HUD simples, corrida com personagens e painel inferior, e ensino de dedos com teclado grande.

### Tokens


| Token | Direção |
| --- | --- |
| Primária | Azul institucional ou tom definido pela identidade T&T. |
| Secundária | Turquesa ou ciano para progresso e interação. |
| Destaque | Amarelo para recompensa, CTA e posição. |
| Sucesso | Verde acessível. |
| Erro | Vermelho acessível sem depender apenas da cor. |
| Fundo | Claro neutro para área educacional, escuro opcional para jogos. |
| Raio | 12 a 20 pixels em cards principais. |
| Sombra | Suave e limitada. |
| Tipografia | Sans serif de alta legibilidade. |


### Componentes obrigatórios

- Botão
- Card
- Modal
- Toast
- Tooltip
- Barra de progresso
- Badge
- Avatar
- Tabela
- Filtro
- Tabs
- Input
- Teclado virtual
- HUD de jogo
- Leaderboard
- Pódio
- Gráfico
- Skeleton de carregamento


## 38. Responsividade

Desktop é a experiência principal. Tablet pode acessar painéis e algumas atividades com teclado físico. Celular pode consultar perfil, ranking e resultados, mas atividades de digitação devem avisar que teclado físico é recomendado.

| Largura | Comportamento |
| --- | --- |
| Desktop amplo | Painéis com sidebar e conteúdo em duas ou três colunas. |
| Notebook | Layout compacto sem perder área de digitação. |
| Tablet | Sidebar recolhível e cards em uma coluna ou duas. |
| Celular | Consulta e gestão simplificada. Jogos de teclado podem ser indisponíveis. |



## 39. Acessibilidade

- Navegação completa por teclado nas áreas que não são exercícios de captura exclusiva.
- Foco visível.
- Contraste adequado.
- Não depender somente de cor para comunicar erro.
- Alternativa para animações intensas.
- Opção de reduzir movimento.
- Textos redimensionáveis.
- Labels acessíveis em formulários.
- Mensagens de erro associadas aos campos.
- Áudio nunca deve ser o único meio de transmitir informação, exceto em exercício de ditado cuja finalidade seja explicitamente auditiva.
- Evitar flashes.
Adotar WCAG 2.2 como referência de acessibilidade para a interface.


## 40. Performance


| Indicador | Meta inicial |
| --- | --- |
| Primeira tela | Carregamento percebido rápido em conexão escolar comum. |
| Interação de digitação | Resposta visual imediata, sem depender de ida ao servidor por tecla. |
| Jogo | Meta de 60 quadros por segundo em hardware compatível, com degradação elegante. |
| Bundle | Dividir código por rota e carregar jogos sob demanda. |
| Imagens | WebP ou AVIF quando aplicável. |
| Vetores | SVG otimizado. |
| Áudio | Arquivos comprimidos e carregamento sob demanda. |
| Animação | Preferir transformações e Canvas quando adequado. |


### Regra crítica

O evento de teclado deve ser processado localmente para feedback instantâneo. Persistência pode ser feita em lotes ou ao final de blocos, com estratégia segura para perda de conexão.


## 41. Arquitetura técnica recomendada

A stack pode ser adaptada à preferência do desenvolvedor, mas a arquitetura precisa separar interface, domínio, persistência e tempo real.

| Camada | Sugestão |
| --- | --- |
| Frontend | Next.js, React e TypeScript. |
| Estilo | Tailwind CSS e biblioteca de componentes própria. |
| Jogos | Phaser ou Canvas 2D com TypeScript. |
| Backend | NestJS ou serviço TypeScript equivalente. |
| Banco | PostgreSQL. |
| Cache e ranking | Redis. |
| Tempo real | WebSocket com Socket.IO ou solução equivalente. |
| Arquivos | Object storage compatível com S3. |
| Fila | BullMQ ou equivalente quando necessário. |
| Observabilidade | Logs estruturados, métricas e rastreamento de erros. |
| Deploy | Docker, com ambientes separados. |


### Alternativa

Se a equipe dominar outra stack madura, ela pode ser usada. O requisito é atender desempenho, segurança, tempo real, testabilidade e manutenção.


## 42. Modelo de dados conceitual


| Entidade | Responsabilidade |
| --- | --- |
| users | Identidade, papel, status e autenticação. |
| students | Dados escolares do aluno. |
| teachers | Dados de professor. |
| classes | Turmas. |
| class_members | Vínculo aluno e turma. |
| learning_paths | Trilhas. |
| worlds | Mundos da trilha. |
| levels | Níveis. |
| exercises | Exercícios. |
| exercise_items | Itens de conteúdo. |
| attempts | Tentativas. |
| keystroke_stats | Estatísticas agregadas por tecla. |
| bigram_stats | Estatísticas agregadas por transição. |
| game_sessions | Partidas individuais. |
| live_rooms | Salas ao vivo. |
| room_participants | Participantes. |
| room_results | Resultados. |
| seasons | Temporadas. |
| leaderboards | Definições de ranking. |
| leaderboard_entries | Entradas consolidadas. |
| achievements | Conquistas. |
| user_achievements | Conquistas obtidas. |
| missions | Missões. |
| user_missions | Progresso de missão. |
| wallets | Saldo de moeda virtual. |
| wallet_transactions | Movimentações. |
| cosmetics | Itens cosméticos. |
| user_cosmetics | Itens do usuário. |
| audit_logs | Auditoria administrativa. |



## 43. Campos essenciais de tentativa


| Campo | Descrição |
| --- | --- |
| id | Identificador. |
| user_id | Aluno. |
| exercise_id | Exercício. |
| mode | Modo. |
| started_at | Início. |
| finished_at | Fim. |
| duration_ms | Duração. |
| expected_chars | Quantidade esperada. |
| typed_chars | Quantidade digitada. |
| correct_chars | Corretos. |
| incorrect_chars | Incorretos. |
| wpm_raw | WPM bruto. |
| wpm_net | WPM líquido. |
| accuracy | Precisão. |
| consistency | Consistência. |
| backspaces | Correções. |
| score | Pontuação. |
| formula_version | Versão de cálculo. |
| client_version | Versão do cliente. |
| integrity_status | Status de integridade. |


### Dados de tecla

Não é obrigatório armazenar cada tecla bruta indefinidamente. Para privacidade e escala, preferir estatísticas agregadas. Eventos detalhados podem ter retenção limitada para diagnóstico e cálculo, conforme necessidade.


## 44. API funcional


| Grupo | Operações |
| --- | --- |
| Auth | Login, logout, renovar sessão, trocar senha. |
| Users | Criar, listar, editar, arquivar, redefinir senha. |
| Classes | CRUD, membros, professor, metas. |
| Paths | Listar trilhas, mundos, níveis e progresso. |
| Exercises | CRUD, publicar, atribuir, iniciar e concluir. |
| Attempts | Criar sessão, enviar resumo, consultar histórico. |
| Stats | Resumo, séries temporais, teclado, bigramas. |
| Games | Configuração, iniciar, finalizar e histórico. |
| Rooms | Criar, entrar, lobby, iniciar, eventos, finalizar. |
| Rankings | Consultar e recalcular quando autorizado. |
| Seasons | CRUD e fechamento. |
| Missions | CRUD e progresso. |
| Reports | Consultas agregadas e exportações. |
| Audit | Consulta restrita. |


### Padrões

- Versionar API.
- Paginar listas.
- Validar payload no servidor.
- Usar identificadores opacos.
- Retornar erros padronizados.
- Aplicar idempotência em operações críticas quando necessário.


## 45. WebSocket e eventos de sala


| Evento | Direção | Função |
| --- | --- | --- |
| room_join | Cliente para servidor | Solicita entrada. |
| room_state | Servidor para cliente | Estado do lobby. |
| participant_joined | Servidor para sala | Atualiza participantes. |
| countdown | Servidor para sala | Sincroniza início. |
| game_start | Servidor para sala | Inicia partida. |
| progress_update | Cliente para servidor | Envia progresso validável em frequência limitada. |
| leaderboard_update | Servidor para sala | Atualiza posições. |
| participant_reconnected | Servidor para sala | Retorno de conexão. |
| game_finish | Servidor para sala | Fecha partida. |
| podium | Servidor para sala | Resultado oficial. |


### Proteção

Aplicar limite de frequência. O servidor deve rejeitar progressos impossíveis ou incompatíveis com a sessão.


## 46. Integridade competitiva

- Tempo oficial do servidor.
- Conteúdo oficial identificado por hash ou versão.
- Pontuação recalculável.
- Limite plausível de eventos.
- Detecção de sessão duplicada.
- Sinalização de resultados anômalos para revisão.
- Não bloquear automaticamente um aluno apenas por ser muito rápido.
- Resultados suspeitos podem ficar fora de ranking até validação.
- Guardar trilha de auditoria de campeonatos.

### Princípio

Anti fraude não deve punir alto desempenho legítimo. A plataforma deve aceitar que usuários de elite podem atingir velocidades incomuns.


## 47. Segurança e privacidade

- HTTPS obrigatório.
- Senhas com hash moderno e salt.
- Cookies seguros quando usados.
- Controle de acesso por papel.
- Validação de entrada.
- Proteção contra ataques comuns de aplicações web.
- Segredos apenas em variáveis seguras do ambiente.
- Backups protegidos.
- Logs sem senha ou conteúdo sensível desnecessário.
- Política de retenção de dados.
- Exportação e exclusão conforme obrigações aplicáveis.
- Auditoria de ações administrativas relevantes.
A implementação deve considerar boas práticas atuais da OWASP e requisitos aplicáveis da LGPD. Como o produto pode ser usado por estudantes, minimizar coleta de dados e evitar recursos sociais desnecessários.


## 48. Observabilidade

- Taxa de erro por rota.
- Latência de API.
- Conexões WebSocket.
- Falhas de reconexão.
- Tempo de consulta de ranking.
- Uso de CPU e memória.
- Erros de frontend.
- Versão do cliente.
- Falhas de salvamento de tentativa.
- Fila de tarefas.
- Saúde do banco e cache.

### Alertas

Criar alertas para indisponibilidade, erro elevado, saturação e falha de persistência. Não gerar alerta por qualquer evento pequeno.


## 49. Analytics de produto


| Métrica | Por que importa |
| --- | --- |
| Ativação | Aluno concluiu primeira atividade. |
| Retenção semanal | Uso recorrente. |
| Minutos de prática | Engajamento real. |
| Conclusão de níveis | Progresso. |
| Precisão média | Qualidade. |
| Evolução de WPM | Resultado. |
| Uso de jogos | Aderência. |
| Entrada em sala | Uso em aula. |
| Conclusão de competição | Engajamento coletivo. |
| Abandono por tela | Problemas de UX. |
| Tempo para iniciar sala | Simplicidade para professor. |


### North Star

Métrica principal sugerida: minutos de prática qualificada por aluno ativo, onde prática qualificada exige conteúdo elegível e precisão mínima. Isso evita otimizar o produto apenas para cliques ou tempo de tela.


## 50. Critérios de aceite do MVP

CA 01. Administrador consegue criar turma.
CA 02. Administrador consegue criar aluno com nome, turma, código e senha.
CA 03. Aluno consegue entrar com código e senha.
CA 04. Aluno visualiza trilha.
CA 05. Aluno conclui exercício tradicional.
CA 06. Sistema calcula WPM e precisão corretamente.
CA 07. Sistema salva tentativa.
CA 08. Professor visualiza resultados da turma.
CA 09. Professor cria sala ao vivo.
CA 10. Sistema gera código temporário.
CA 11. Alunos entram no lobby.
CA 12. Professor inicia partida.
CA 13. Todos recebem início sincronizado.
CA 14. Servidor consolida ranking.
CA 15. Partida termina com pódio.
CA 16. Existe pelo menos um jogo 2D além do modo tradicional.
CA 17. Existe mapa de teclas fracas.
CA 18. Administrador consegue configurar metas de nível.
CA 19. Aplicação funciona em notebook comum sem travamentos perceptíveis.
CA 20. Fluxos críticos possuem testes automatizados.


## 51. Escopo recomendado do MVP

O maior risco é tentar construir vinte jogos antes de validar o motor pedagógico e a sala ao vivo. O MVP deve provar aprendizagem, medição, gestão e competição.

| Inclui no MVP | Fica para versões seguintes |
| --- | --- |
| Login por código e senha | SSO e integrações externas |
| Admin, professor e aluno | Multi tenant comercial completo |
| Turmas e cadastro em lote | Marketplace |
| Trilha com níveis | Editor visual avançado de trilhas |
| Modo tradicional | Grande catálogo de jogos |
| Sprint | Cooperativo complexo |
| T&T Orbital | Bosses elaborados |
| T&T Turbo | Itens cosméticos extensos |
| Sala ao vivo | Torneios mata mata avançados |
| Ranking | Sistema social |
| Temporada simples | Economia avançada |
| Relatórios essenciais | BI avançado |
| Motor adaptativo versão 1 | IA generativa opcional |



## 52. Roadmap


| Fase | Objetivo | Entregas |
| --- | --- | --- |
| Fase 0 | Fundação | Design system, arquitetura, auth, banco, CI e ambientes. |
| Fase 1 | Aprender | Trilha, exercícios, teclado, métricas e progresso. |
| Fase 2 | Gestão | Admin, professor, turmas, relatórios e importação. |
| Fase 3 | Competir | Sala ao vivo, ranking, pódio e T&T Turbo. |
| Fase 4 | Jogar | T&T Orbital e segundo pacote de jogos. |
| Fase 5 | Reter | Ligas, temporada, missões, conquistas e cosméticos. |
| Fase 6 | Otimizar | Motor adaptativo avançado, analytics e performance. |
| Fase 7 | Escalar | Multi unidade, licenciamento e integrações. |


### Gate de cada fase

Nenhuma fase deve avançar apenas porque o código está pronto. Exigir testes, aceite funcional, métricas mínimas de performance e revisão visual.


## 53. Estratégia de testes


| Tipo | Cobertura |
| --- | --- |
| Unitário | Fórmulas, regras de desbloqueio, ranking e motor adaptativo. |
| Integração | Auth, banco, permissões e persistência. |
| E2E | Login, lição, sala, competição, admin. |
| Carga | Salas simultâneas e ranking. |
| Visual | Componentes e telas principais. |
| Acessibilidade | Teclado, foco, contraste e labels. |
| Compatibilidade | Chrome, Edge e navegadores suportados. |
| Rede ruim | Reconexão e salvamento. |
| Segurança | Permissões, validação e sessões. |


### Casos críticos

- Aluno não pode consultar outro aluno por trocar identificador na URL.
- Aluno não pode alterar pontuação pelo cliente.
- Professor não pode administrar turma sem permissão.
- Queda de rede não pode gerar duas tentativas oficiais.
- Ranking deve ser determinístico.
- Mudança de fórmula não altera histórico antigo.


## 54. Estados de erro e vazios


| Situação | Comportamento |
| --- | --- |
| Sem internet | Mostrar reconexão e preservar estado possível. |
| Sala inexistente | Mensagem simples e retorno para entrada de código. |
| Código expirado | Informar expiração. |
| Sem alunos na turma | Explicar como cadastrar ou importar. |
| Sem dados de progresso | Não mostrar gráfico enganoso. |
| Exercício indisponível | Retornar à trilha e registrar erro técnico. |
| Falha ao salvar | Tentar novamente e informar sem perder resultado local imediatamente. |
| Permissão negada | Tela apropriada, sem revelar dados. |



## 55. Conteúdo inicial sugerido

Para lançamento, recomenda se produzir uma biblioteca própria e curada.

| Pacote | Quantidade sugerida |
| --- | --- |
| Lições fundamentais | 120 |
| Listas de palavras | 100 |
| Frases | 500 |
| Textos curtos | 100 |
| Textos médios | 50 |
| Treinos profissionais | 50 |
| Treinos de números | 30 |
| Treinos de símbolos | 30 |
| Desafios de precisão | 30 |
| Desafios de velocidade | 30 |


### Direitos autorais

Usar textos próprios, licenciados ou de domínio público. Não copiar grandes trechos de obras protegidas ou conteúdo de concorrentes.


## 56. Regras para conteúdo em português

- Vocabulário natural do português brasileiro.
- Frequência de palavras como sinal para progressão.
- Acentuação introduzida gradualmente.
- Cedilha e sinais do ABNT2 tratados explicitamente.
- Maiúsculas treinadas com Shift da mão oposta quando aplicável.
- Textos finais devem conter pontuação real.
- Evitar palavras ofensivas em listas aleatórias.
- Separar conteúdo pedagógico de conteúdo de alta velocidade.


## 57. Inteligência artificial, uso opcional

IA pode melhorar o produto, mas não deve ser dependência do MVP.

### Usos adequados

- Sugerir exercícios a partir de estatísticas.
- Gerar variações de texto que depois passam por validação.
- Resumir desempenho para professor.
- Classificar padrões de erro.
- Sugerir dificuldade.

### Usos inadequados

- Decidir sozinho aprovação ou reprovação.
- Gerar conteúdo sem filtro para alunos.
- Substituir regras determinísticas de ranking.
- Enviar dados pessoais desnecessários para modelos externos.


## 58. Configurações administrativas


| Grupo | Configurações |
| --- | --- |
| Marca | Nome, logo, favicon e cores. |
| Aprendizagem | Metas padrão, desbloqueio e precisão mínima. |
| Jogos | Ativos, dificuldade e efeitos. |
| Ranking | Escopos, elegibilidade e desempate. |
| Temporada | Datas, ligas e promoções. |
| Sala | Limite, entrada tardia e reconexão. |
| Conta | Política de senha e sessão. |
| Dados | Retenção e exportação. |
| Interface | Tema e redução de movimento. |
| Conteúdo | Idioma e layout de teclado. |



## 59. Permissões


| Ação | Aluno | Professor | Admin |
| --- | --- | --- | --- |
| Ver próprio progresso | Sim | Sim, se também usuário | Sim |
| Ver turma | Ranking limitado | Turmas atribuídas | Todas |
| Criar sala | Não | Sim | Sim |
| Criar atividade | Não | Se permitido | Sim |
| Criar aluno | Não | Opcional | Sim |
| Editar trilha | Não | Não por padrão | Sim |
| Fechar temporada | Não | Não | Sim |
| Ver auditoria | Não | Não | Sim restrito |
| Exportar dados | Não | Turma se permitido | Sim |



## 60. Wireframes textuais


### Aluno, início

[Topo] Logo T&T | XP | Liga | Avatar
[Card principal] Continuar: Mundo 4, Nível 3 | botão Continuar
[Linha] Meta de hoje | 12 de 15 minutos | barra de progresso
[Cards] WPM atual | Precisão | Sequência | Posição na turma
[Bloco] Trilha visual com níveis
[Bloco] Competição mensal
[Rodapé] Aprender | Treinar | Jogar | Competir | Perfil

### Professor, turma

[Sidebar] Visão geral | Turmas | Atividades | Salas | Relatórios
[Topo] Turma Informática 01 | Criar atividade | Criar sala
[Cards] 24 alunos | 19 ativos | 96,8 por cento precisão | 42 WPM
[Tabela] Aluno | Nível | WPM | Precisão | Tempo | Último acesso | Ação

### Sala

[Topo] Código 482731 | QR | Configurações
[Centro] Participantes em cards
[Rodapé] Cancelar | Iniciar partida


## 61. Fluxo de aprendizagem

Login → Início → Continuar → Introdução da habilidade → Demonstração de dedo → Exercício guiado → Exercício de consolidação → Resultado → Recomendação → Próximo nível ou reforço.

### Se falhar

Se a precisão ficar abaixo da meta, o sistema não deve simplesmente dizer Reprovado. Deve indicar duas ou três causas objetivas, oferecer treino curto de reforço e permitir nova tentativa.

### Se dominar

Se o aluno superar a meta com consistência, oferecer avanço ou desafio opcional.


## 62. Fluxo de competição mensal

Administrador cria temporada → define período e ligas → alunos acumulam pontos elegíveis → ranking atualiza → missões semanais adicionam variedade → reta final mostra posição → temporada encerra → resultados congelados → recompensas digitais → histórico → nova temporada.

### Evitar

Não criar mecânica em que o aluno precise permanecer horas conectado para competir. Limitar pontuação repetitiva e valorizar qualidade, evolução e desafios variados.


## 63. Requisitos funcionais consolidados

RF001. O sistema deve autenticar aluno por código e senha.
RF002. O sistema deve permitir criação de aluno com nome e turma.
RF003. O sistema deve permitir importação em lote.
RF004. O sistema deve suportar papéis e permissões.
RF005. O sistema deve manter trilhas, mundos, níveis e exercícios.
RF006. O sistema deve registrar progresso individual.
RF007. O sistema deve calcular WPM, CPM, precisão e erros.
RF008. O sistema deve manter versão da fórmula de cálculo.
RF009. O sistema deve gerar estatísticas por tecla.
RF010. O sistema deve gerar estatísticas por bigrama.
RF011. O sistema deve recomendar treino adaptativo.
RF012. O sistema deve oferecer modo tradicional.
RF013. O sistema deve oferecer modo Sprint.
RF014. O sistema deve suportar jogos 2D.
RF015. O sistema deve permitir ativar ou desativar jogos.
RF016. O sistema deve criar salas ao vivo.
RF017. O sistema deve gerar código temporário de sala.
RF018. O sistema deve possuir lobby.
RF019. O anfitrião deve controlar o início.
RF020. O servidor deve manter tempo oficial.
RF021. O sistema deve atualizar ranking da sala.
RF022. O sistema deve exibir pódio.
RF023. O sistema deve persistir resultados de sala.
RF024. O sistema deve suportar reconexão.
RF025. O sistema deve possuir rankings por escopo.
RF026. O sistema deve possuir temporadas.
RF027. O sistema deve possuir ligas.
RF028. O sistema deve possuir XP.
RF029. O sistema deve possuir missões.
RF030. O sistema deve possuir conquistas.
RF031. O sistema deve suportar moeda virtual sem vantagem competitiva.
RF032. O sistema deve possuir catálogo cosmético.
RF033. Professor deve visualizar turmas atribuídas.
RF034. Professor deve criar atividade.
RF035. Professor deve criar sala.
RF036. Professor deve consultar progresso do aluno.
RF037. Admin deve gerenciar usuários.
RF038. Admin deve gerenciar turmas.
RF039. Admin deve gerenciar trilhas.
RF040. Admin deve gerenciar conteúdo.
RF041. Admin deve configurar metas.
RF042. Admin deve gerenciar temporada.
RF043. Admin deve consultar auditoria.
RF044. O sistema deve exportar relatórios essenciais.
RF045. O sistema deve suportar teclado ABNT2.
RF046. A arquitetura deve permitir novos layouts.
RF047. O sistema deve mostrar teclado virtual quando configurado.
RF048. O sistema deve mostrar indicação de dedos.
RF049. O sistema deve permitir ocultar ajuda em níveis avançados.
RF050. O sistema deve suportar exercícios de números e símbolos.
RF051. O sistema deve suportar textos profissionais fictícios.
RF052. O sistema deve suportar ditado no futuro sem alterar o modelo central.
RF053. O sistema deve ter estados de rascunho e publicado para conteúdo.
RF054. O sistema deve validar teclas permitidas em lições.
RF055. O sistema deve registrar histórico de tentativas.
RF056. O sistema deve comparar desempenho recente.
RF057. O sistema deve identificar recordes pessoais.
RF058. O sistema deve aplicar precisão mínima em rankings oficiais.
RF059. O sistema deve suportar campeonatos.
RF060. O sistema deve congelar regras de campeonato iniciado.
RF061. O sistema deve registrar versão de conteúdo competitivo.
RF062. O sistema deve permitir arquivar usuários.
RF063. O sistema deve permitir redefinir senha.
RF064. O sistema deve registrar último acesso.
RF065. O sistema deve oferecer filtros nos relatórios.
RF066. O sistema deve possuir busca em usuários e turmas.
RF067. O sistema deve possuir paginação.
RF068. O sistema deve oferecer feedback de erro de digitação.
RF069. O sistema deve oferecer modo de efeitos reduzidos.
RF070. O sistema deve permitir som ligado ou desligado.
RF071. O sistema deve salvar preferências do usuário.
RF072. O sistema deve funcionar sem recarregar página durante exercício.
RF073. O sistema deve carregar jogos sob demanda.
RF074. O sistema deve manter estado de sala no servidor.
RF075. O sistema deve limitar eventos de tempo real.
RF076. O sistema deve sinalizar resultado anômalo.
RF077. O sistema deve permitir revisão administrativa de resultado sinalizado.
RF078. O sistema deve impedir aluno de alterar configuração oficial.
RF079. O sistema deve permitir metas por turma.
RF080. O sistema deve permitir trilha por turma.
RF081. O sistema deve permitir atividade com prazo.
RF082. O sistema deve mostrar atividades pendentes.
RF083. O sistema deve registrar conclusão.
RF084. O sistema deve permitir reexecução conforme regra.
RF085. O sistema deve diferenciar treino de teste oficial.
RF086. O sistema deve diferenciar XP de pontos de temporada.
RF087. O sistema deve preservar histórico de temporadas.
RF088. O sistema deve preservar histórico de certificações.
RF089. O sistema deve permitir código de verificação de certificado no futuro.
RF090. O sistema deve registrar logs administrativos.
RF091. O sistema deve possuir dashboard de saúde funcional para admin.
RF092. O sistema deve mostrar vazios informativos.
RF093. O sistema deve tratar expiração de sala.
RF094. O sistema deve tratar perda de conexão.
RF095. O sistema deve impedir duplicidade de tentativa oficial.
RF096. O sistema deve suportar conteúdo em português brasileiro.
RF097. O sistema deve aceitar alto WPM sem limite artificial.
RF098. O sistema deve suportar testes longos.
RF099. O sistema deve suportar exercícios adaptativos sem IA externa.
RF100. O sistema deve permitir evolução futura para multi unidade.


## 64. Requisitos não funcionais

RNF001. Interface de digitação deve responder localmente a cada tecla.
RNF002. Operações de autorização devem ser validadas no servidor.
RNF003. Tráfego deve usar HTTPS.
RNF004. Senhas nunca devem ser armazenadas em texto puro.
RNF005. Banco deve possuir backup automatizado.
RNF006. Ambientes de desenvolvimento, homologação e produção devem ser separados.
RNF007. Aplicação deve possuir logs estruturados.
RNF008. Erros de frontend devem ser observáveis.
RNF009. API deve ser versionada.
RNF010. Listagens grandes devem ser paginadas.
RNF011. Jogos devem carregar sob demanda.
RNF012. Imagens e áudio devem ser otimizados.
RNF013. Aplicação deve degradar animações em hardware fraco.
RNF014. Interface deve atender princípios de WCAG 2.2.
RNF015. Sistema deve possuir foco visível.
RNF016. Sistema deve funcionar nos navegadores definidos pela T&T.
RNF017. Sala deve suportar pelo menos 50 participantes na meta inicial.
RNF018. Ranking deve ser determinístico.
RNF019. Dados competitivos devem ser auditáveis.
RNF020. O produto deve minimizar coleta de dados pessoais.
RNF021. Conteúdo de treino não deve usar dados pessoais reais.
RNF022. Alterações críticas devem ter trilha de auditoria.
RNF023. Deploy deve ser automatizável.
RNF024. Migrações de banco devem ser versionadas.
RNF025. Código deve possuir lint, formatação e testes no pipeline.
RNF026. Componentes principais devem ser reutilizáveis.
RNF027. Fórmulas de métricas devem possuir testes unitários.
RNF028. Eventos de sala devem possuir controle de frequência.
RNF029. Estado oficial não deve depender de relógio do cliente.
RNF030. Falhas temporárias de rede devem ser tratadas sem tela quebrada.


## 65. Definition of Done

- Código revisado.
- Critérios de aceite atendidos.
- Testes relevantes passando.
- Sem erro conhecido crítico.
- Permissões revisadas.
- Responsividade revisada.
- Acessibilidade básica revisada.
- Performance medida.
- Logs adequados.
- Migração de banco testada.
- Documentação atualizada.
- Homologação aprovada.


## 66. Riscos e decisões estratégicas


| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Construir jogos demais cedo | Alto | Validar motor pedagógico e competição primeiro. |
| Ranking premiar erro | Alto | Precisão mínima e WPM líquido. |
| Frontend pesado | Alto | 2D leve, carregamento sob demanda e orçamento de performance. |
| Fraude em sala | Médio a alto | Servidor autoritativo e validação. |
| Conteúdo fraco | Alto | Biblioteca curada e revisão pedagógica. |
| Admin complexo | Médio | Fluxos simples, defaults e importação. |
| Gamificação virar distração | Alto | Cada mecânica precisa de objetivo pedagógico. |
| Dados demais | Médio | Agregação e retenção consciente. |
| IA virar dependência | Médio | Motor adaptativo determinístico primeiro. |
| Escopo explodir | Alto | Roadmap com gates. |



## 67. O que torna o produto realmente diferente

A vantagem da T&T não deve ser ter mais minijogos. Concorrentes podem copiar jogos. A vantagem defensável é a integração entre aprendizagem estruturada, telemetria de digitação, adaptação individual, competição de sala e gestão pedagógica.
- Mapa de fraquezas por tecla e transição.
- Treino adaptativo que usa essas fraquezas.
- Competições em que precisão vale tanto quanto velocidade.
- Conteúdo profissional ligado aos cursos da T&T.
- Temporada mensal conectada à evolução real.
- Professor enxergando progresso em poucos segundos.
- Experiência leve o suficiente para laboratório comum.
- Camada Elite que evita o aluno abandonar a plataforma quando fica muito bom.


## 68. Backlog posterior ao MVP

- Mais jogos.
- Cooperativo por equipes.
- Boss de turma.
- Torneio mata mata.
- Editor avançado de trilhas.
- Temas por curso.
- Certificados verificáveis.
- Integração com LMS.
- SSO.
- Multi unidade comercial.
- White label.
- Aplicativo de acompanhamento.
- Desafios entre unidades.
- Relatórios preditivos.
- Recomendação assistida por IA.
- Biblioteca de conteúdo por profissão.
- Layout de teclado internacional.


## 69. Checklist de handoff para o desenvolvedor

- Confirmar identidade visual final da T&T.
- Confirmar nome comercial do produto.
- Confirmar stack.
- Criar repositórios.
- Criar ambientes.
- Modelar banco.
- Implementar autenticação.
- Implementar permissões.
- Construir design system.
- Construir motor de exercício antes dos jogos.
- Validar fórmulas.
- Construir trilha.
- Construir painel do professor.
- Construir sala ao vivo.
- Fazer teste de carga.
- Construir primeiro jogo.
- Instrumentar analytics.
- Homologar com uma turma real.
- Corrigir UX.
- Somente depois ampliar catálogo.


## 70. Referências de pesquisa

As referências abaixo servem como benchmark conceitual. Nenhum ativo, texto, personagem, código ou layout deve ser copiado.
- Ratatype, Ratashooter, mecânica de shooter de palavras, níveis, bônus e personagens.
- AgileFingers, lições progressivas, teclado virtual, jogos e prática por habilidade.
- Typing.com, currículo gamificado, gestão de turmas, testes, conteúdo adaptativo e relatórios.
- TypingClub e edclub, progressão educacional e orientação visual de dedos.
- Kahoot, código temporário, lobby, controle do anfitrião, ranking e pódio.
- Duolingo, XP, ligas, missões, temporadas e progressão.
- Monkeytype, testes configuráveis e métricas para usuários avançados.
- ZType, ação em tempo real vinculada à palavra digitada.
- OWASP, boas práticas de segurança de aplicações e autenticação.
- W3C WCAG 2.2, acessibilidade.

### Fontes consultadas em agosto de 2026

Ratatype, página oficial do Ratashooter. AgileFingers, páginas oficiais de jogos, lições e curso. Typing.com, páginas oficiais para alunos e professores. Kahoot, central oficial de ajuda sobre PIN e jogos ao vivo. OWASP e W3C como referências técnicas.


## 71. Decisão final de produto

A T&T deve lançar uma plataforma de aprendizagem de digitação com jogos, não uma plataforma de jogos que por acaso usa teclado. Essa diferença deve orientar todas as decisões.
A primeira versão de sucesso é aquela em que um professor consegue cadastrar uma turma, os alunos entram com facilidade, aprendem técnica correta, praticam, veem sua evolução, entram em uma sala competitiva e o professor consegue provar que a turma melhorou.
Depois que esse núcleo estiver sólido, jogos, ligas, temporadas, cosméticos e inteligência artificial aumentam retenção e diferenciação sem comprometer o objetivo central.
Este documento deve ser considerado a base funcional da versão 1.0. Alterações relevantes de escopo devem ser registradas como decisões de produto para evitar divergência entre o que foi combinado e o que foi implementado.