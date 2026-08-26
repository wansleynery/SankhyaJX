# SankhyaJX

> 💬 **Se sente meio esquecido por aí?** Desde a migração da plataforma oficial, o diálogo
> entre devs Sankhya ficou mais difícil. Comunidade (não oficial) no Discord:
> **<https://discord.gg/ke8DmDKdk7>** — bons códigos, amigo!

---

Uma classe estática (`JX`) que cobre o que uma tela ou automação em Sankhya-W
precisa: chamar serviços, consultar e gravar no banco, acionar botões de ação,
navegar entre telas e ler parâmetros/cookies — sem depender do AngularJS
nativo nem montar `fetch`/JSON na mão a cada chamada.

---

## Instalação

Self-host, baixando `jx.js` (legível, para homologação/debug) ou `jx.min.js`
(produção) e importando no seu projeto:

```html
<script src="jx.js"></script>       <!-- Homologação e Debug -->
<script src="jx.min.js"></script>   <!-- Produção -->
```

Ou direto do CDN [jsDelivr](https://www.jsdelivr.com/), sempre com a última
versão publicada:

```html
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
```

O cache do jsDelivr pode levar até 24h para atualizar — um push recente nem
sempre está disponível de imediato.

---

## Referência rápida

| Método                                          | O que faz                                                                                                        |
|-------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| `consultar(query)`                              | SQL via `DbExplorerSP.executeQuery` (exige permissão no Consolidador de Dados)                                   |
| `executarConsulta(query)`                       | SQL via `ExecQuerySP.execQuery`, sem exigir Consolidador de Dados                                                |
| `salvar(dados, instancia, chavesPrimarias)`     | Grava via `CRUDServiceProvider.saveRecord`                                                                       |
| `novoSalvar(dados, instancia, chavesPrimarias)` | Grava via `DatasetSP.save` (serviço das telas nativas)                                                           |
| `deletar(instancia, chavesPrimarias)`           | Remove via `DatasetSP.removeRecord`                                                                              |
| `acionarBotao(dados, opcoes)`                   | Aciona remotamente um botão de ação (JS, Java ou SQL)                                                            |
| `removerFrame(configuracoes)`                   | Tira uma tela BI da moldura de gadget, abrindo em tela cheia (sem argumentos, só esconde a barra/título via CSS) |
| `novaGuia(forcado)`                             | Abre a página atual em nova aba                                                                                  |
| `abrirPagina(resourceID, chavesPrimarias)`      | Navega para outra tela dentro do Sankhya-W                                                                       |
| `fecharPagina()`                                | Fecha a aba/tela atual                                                                                           |
| `getUrl(path)`                                  | Monta URL absoluta a partir da origem atual                                                                      |
| `getCookie(nome)`                               | Lê um cookie do documento                                                                                        |
| `getArquivo(caminho)`                           | Busca o conteúdo de um arquivo estático                                                                          |
| `getParametro(nomes)`                           | Lê parâmetros do sistema, já convertidos pro tipo certo                                                          |
| `chamarServico(nome, dados, opcoes)`            | Chama qualquer serviço `service.sbr`, de qualquer módulo                                                         |
| `post(url, corpo, opcoes)` / `get(url, opcoes)` | HTTP baixo nível — a base de todos os métodos acima                                                              |

---

## Exemplos

### Banco de dados

```javascript
JX.consultar ('SELECT * FROM TGFMAR').then (console.log);

// Sem exigir permissão no Consolidador de Dados
JX.executarConsulta ('SELECT * FROM TGFMAR WHERE CODIGO IN (1, 2, 3)').then (console.log);

// Criar (chave vazia) ou atualizar (chave preenchida) — aceita array para lote
JX.salvar ({ DESCRICAO: 'Qualquer Marca' }, 'MarcaProduto', [{}, {}, {}]).then (console.log);
JX.salvar ({ DESCRICAO: 'Outro produto' }, 'MarcaProduto', { CODIGO: 999 }).then (console.log);

// Mesma ideia, pelo serviço DatasetSP.save (o que as telas nativas usam)
JX.novoSalvar ({ SERIE: 'h' }, 'AD_SERIENOTAITEM', { ID: '1', IDSERIE: '2' });

JX.deletar ('MarcaProduto', [{ CODIGO: 9998 }, { CODIGO: 9999 }]).then (console.log);
```

Em `salvar`/`deletar`, erro num item do lote não interrompe os demais — cada
chave é resolvida numa chamada independente.

### Ações e navegação

```javascript
JX.acionarBotao (
    { PARAMETRO_A: 'Valor', PARAMETRO_B: 'false' },   // booleano vai como string
    { tipo: 'JS', idBotao: 30 }                        // tipo: 'js' | 'java' | 'sql'
    // tipo 'sql' também exige: entidade, nomeProcedure
).then (console.log);

JX.novaGuia ();
JX.abrirPagina ('br.com.sankhya.core.cad.marcas', { CODIGO: 999 });
JX.fecharPagina ();
```

### Tela de BI em tela cheia

```javascript
JX.removerFrame ({ instancia: 'TELA_HTML5', paginaInicial: 'paginas/entidade/index.jsp' });

// Sem paginaInicial: descobre o entryPoint automaticamente a partir do gadget
JX.removerFrame ({ instancia: 'TELA_HTML5' });

// Sem nenhum argumento: so esconde a barra/titulo do gadget via CSS (provisorio,
// util enquanto o BI ainda esta renderizando e a instancia nao e conhecida)
JX.removerFrame ();
```

### Utilitários

```javascript
JX.getUrl ('js/dashboardGrid/dashboardGrid.css');   // https://host/mge/js/dashboardGrid/dashboardGrid.css
JX.getCookie ('JSESSIONID');
JX.getArquivo ('/caminho/do/arquivo.txt').then (console.log);

// Aceita um nome, um array de nomes, ou nada (lista tudo). Tipo C vira o rótulo
// da opção, D vira Date, L vira boolean — não o valor cru do parâmetro.
JX.getParametro (['PERCSTCAT137SP', 'BASESNKPADRAO']).then (console.log);
```

### Chamada de serviço genérica

```javascript
JX.chamarServico ('mgecom@admin.getVersao', null).then (console.log);
JX.chamarServico ('WorkspaceSP.getStartupData',
    '<serviceRequest serviceName="WorkspaceSP.getStartupData"><requestBody/></serviceRequest>');
```

`nomeServico` aceita `"modulo@Servico"` (`mgecom`, `mgefin`, `mgeos` já vêm
configurados) ou só `"Servico"`, que cai em `mge`. Resposta com `status` 0/3
lança exceção; 2/4 só loga um aviso no console.

---

## Considerações

- Métodos assíncronos retornam `Promise` — trate os erros (`.catch` ou
  `try/catch`).
- `post`/`get` engolem falha de rede e logam no `console.error`, resolvendo
  `undefined` — quem precisa distinguir "falhou" de "resposta vazia" checa o
  retorno.

---

## Licença e crédito

Autoria: **Wansley Nery Soto** — [LinkedIn](https://www.linkedin.com/in/wansleynery/).

Em uma frase: **use a JX à vontade nas suas telas e integrações, mas não
redistribua a biblioteca em si.**

- **Livre e gratuita**: usar em quantas telas, bases e projetos quiser,
  inclusive em bases de clientes e para fins comerciais.
- **Pode editar** os arquivos para adequar à sua base, preservando os avisos
  de autoria.
- **As suas telas e integrações são suas.** O código que você escreve usando
  a JX é seu, e implantá-lo não está sujeito a nada aqui.
- **Não pode**, sem autorização por escrito: redistribuir a JX em si (editada
  ou não), remover os avisos de autoria, ou vendê-la.

Não é uma licença open source.

Precisa de algo que a licença não cobre (redistribuir, embutir em outro
produto, uma parceria)? Abra uma issue.

### Termos completos

> **SankhyaJX — Licença de Uso**
>
> Copyright (c) 2026 Wansley Nery Soto. Todos os direitos reservados.
>
> Neste documento, "a Biblioteca" designa os arquivos deste repositório:
> `jx.js`, `jx.min.js` e a documentação.
>
> **1. Permitido**, gratuitamente e sem necessidade de aviso prévio
>
> a) usar a Biblioteca em telas, integrações e sistemas próprios, em qualquer
> número de bases, ambientes e usuários, inclusive para fins comerciais e em
> bases de clientes;
> b) copiar os arquivos na medida necessária para esse uso, incluindo backup
> e repositórios privados da própria equipe;
> c) **editar e adaptar** os arquivos da Biblioteca, desde que os avisos de
> autoria e de copyright sejam preservados. Esta permissão é para uso
> próprio: o arquivo editado continua sujeito à cláusula 2.
> d) o código autoral que o usuário escrever usando a Biblioteca — suas
> telas, seus componentes e sua lógica de negócio — é de titularidade
> exclusiva dele e não fica sujeito a esta licença; a cláusula 2 alcança a
> Biblioteca, não o trabalho que a usa.
>
> **2. Não permitido**, sem autorização prévia e por escrito do titular
>
> a) redistribuir a Biblioteca, editada ou não, integral ou parcialmente, por
> qualquer meio ou canal, inclusive embutida em outro produto, componente,
> pacote, curso ou oferta de serviço;
> b) publicar a Biblioteca, ou uma variação dela, como biblioteca, template
> ou starter kit próprio;
> c) remover, alterar ou ocultar os avisos de autoria e de copyright
> presentes nos arquivos ou na documentação;
> d) sublicenciar, vender, alugar ou oferecer a Biblioteca como serviço.
>
> **3. Autoria**
>
> A autoria e a titularidade da Biblioteca permanecem integralmente com
> Wansley Nery Soto. Nenhuma permissão acima transfere direito autoral, marca
> ou qualquer outro direito de propriedade intelectual sobre a Biblioteca. As
> adaptações feitas sob a cláusula 1.c não geram titularidade sobre a
> Biblioteca original.
>
> **4. Ausência de garantia**
>
> A BIBLIOTECA É FORNECIDA "COMO ESTÁ", SEM GARANTIA DE QUALQUER NATUREZA,
> EXPRESSA OU IMPLÍCITA, INCLUINDO MAS NÃO SE LIMITANDO A GARANTIAS DE
> ADEQUAÇÃO A UM PROPÓSITO ESPECÍFICO E DE NÃO VIOLAÇÃO. EM NENHUMA HIPÓTESE
> O TITULAR RESPONDERÁ POR QUALQUER RECLAMAÇÃO, DANO OU OUTRA
> RESPONSABILIDADE DECORRENTE DO USO OU DA IMPOSSIBILIDADE DE USO DA
> BIBLIOTECA.
>
> A execução ocorre em ambiente de terceiros (base Sankhya do usuário), sob
> responsabilidade exclusiva de quem a utiliza, inclusive quanto a testes,
> homologação e backup prévios. Arquivos editados sob a cláusula 1.c são de
> responsabilidade exclusiva de quem os editou.
>
> **5. Rescisão**
>
> O descumprimento de qualquer item da cláusula 2 encerra automaticamente, e
> de imediato, as permissões concedidas na cláusula 1.
>
> **6. Contato**
>
> Autorizações, exceções e parcerias: abra uma issue neste repositório.

### Sobre as marcas de terceiros

Sankhya e Sankhya Om são propriedade da Sankhya Gestão de Negócios. Este
repositório não é um produto oficial nem endossado pela Sankhya.
