# SankhyaJX

## Descrição

A classe `JX` é uma coleção de métodos estáticos para facilitar a manipulação de requisições HTTP, manipulação de dados de banco de dados, interação com páginas web e gerenciamento de parâmetros e cookies em aplicações web. Ela oferece funcionalidades como realizar requisições POST e GET, consultar dados de banco, salvar e deletar registros, manipular elementos de páginas web, entre outras.

---

## Instalação

A instalação pode ser feita baixando o arquivo `jx.js` (Homologação e Debug) ou `jx.min.js` (Produção) e importando-o no seu projeto. Por exemplo:

```html
<script src="jx.js"></script>
<!-- ou -->
<script src="jx.min.js"></script>
```

Contudo, a forma mais prática é pegar a ultima versão atualizada do arquivo direto do repositorio do GitHub, usando o cdn do [jsDelivr](https://www.jsdelivr.com/).
Obs.: A atualização do cache do CDN da jsDelivr pode demorar até 24 horas, ou seja, implementações recentes podem não estar disponíveis imediatamente.

```html
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
<!-- ou -->
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
```

---

## Métodos

### Requisições HTTP (evite o uso)

- **post(url, corpo, opcoes)**: Realiza uma requisição do tipo POST.
- **get(url, opcoes)**: Realiza uma requisição do tipo GET.

### Banco de Dados

- **consultar(query)**: Executa uma consulta SQL.
- **salvar(dados, instancia, chavesPrimarias)**: Salva um registro no banco de dados.
- **deletar(instancia, chavesPrimarias)**: Deleta um registro no banco de dados.

### Manipulação de Página

- **removerFrame(configuracoes)**: Remove o frame de uma página de BI.
- **novaGuia(forcado)**: Abre a página atual em uma nova aba.
- **abrirPagina(resourceID, chavesPrimarias)**: Abre uma página específica dentro do sistema.
- **fecharPagina()**: Fecha a página atual.

### Retorno de Valores

- **getUrl(path)**: Retorna a URL atual da página.
- **getCookie(cookieName)**: Busca o valor de um cookie.
- **getArquivo(caminhoArquivo)**: Busca o conteúdo de um arquivo.
- **getParametro(nomesParametros)**: Retorna o valor de parâmetros específicos.

---

## Uso (Exemplos)

Para usar qualquer um dos métodos, basta chamá-los diretamente da classe `JX`, já que todos são estáticos. Por exemplo:

### Banco de Dados

#### Consultar
```javascript
/* Consulta ao banco com resposta formatada em JS */
JX.consultar ('SELECT * FROM TGFMAR').then (console.log);
```

#### Salvar
```javascript
/* Criar multiplos NOVOS registros (deixar as chaves primarias vazias) */
JX.salvar ({ DESCRICAO: 'Qualquer Marca' }, 'MarcaProduto', [{}, {}, {}]).then (console.log);

/* Atualizar multiplos registros (informar as chaves primarias de cada registro) */
/* Repare que, intencionalmente, estou forcando o erro em apenas um dos salvamentos, */
/* mas por nao ser blocante, ele continuara realizando os outros salvamentos com sucesso */
JX.salvar ({ DESCRICAO: 'Outro produto' }, 'MarcaProduto', [{ CODIGO: 'asd' }, { CODIGO: 9998 }, { CODIGO: 9999 }]).then (console.log);
```

#### Deletar
```javascript
/* Apaga multiplos registros (informar as chaves primarias de cada registro) */
/* O primeiro registro nao existe (PK 9997), o que gerarara um erro nessa requisicao */
/* mas por nao ser blocante, ele continuara realizando as outras delecoes com sucesso */
JX.deletar ('MarcaProduto', [{ CODIGO: 9997 }, { CODIGO: 9998 }, { CODIGO: 9999 }]).then (console.log);
```


### Manipulação de Página

#### Acionar Botão de Ação
```javascript
JX.acionarBotao (
    {
        PARAMETRO_A: 'Valor',
        Parametro_B: 'false',    // Enviar valores booleanos como string
        pARameTRo_c: 2           // Validar o nome do parametro a ser recebido
    },
    {
        tipo         : 'JS',         // Tipo do botao de acao (JS, JAVA e SQL)
        idBotao      : 30,           // ID do botao de acao (JS, JAVA e SQL)
        entidade     : 'TELA_TAL',   // Nome da Entidade que possui o botao de acao (apenas SQL)
        nomeProcedure: 'AD_PROC_TAL' // Nome da Procedure a ser executada (apenas SQL)
    }
).then (console.log);
```

#### Remover Frame
```javascript
JX.removerFrame ({ instancia: 'TELA_HTML5', paginaInicial: 'paginas/entidade/index.jsp' });
```

#### Nova Guia
```javascript
JX.novaGuia ();
```

#### Abrir Página
```javascript
JX.abrirPagina ('br.com.sankhya.core.cad.marcas', { CODIGO: 999 });
```

#### Fechar Página
```javascript
JX.fecharPagina ();
```

### Retorno de Valores

#### Get URL
```javascript
/* Busca a URL origem (URL base) do local atual */
console.log (JX.getUrl ())                                      // http://localhost/mge
console.log (JX.getUrl ('js/dashboardGrid/dashboardGrid.css')); // http://localhost/mge/js/dashboardGrid/dashboardGrid.css
```

#### Get Cookie
```javascript
/* Busca do conteudo de um cookie */
let valorCookie = JX.getCookie ('nomeCookie');
console.log (valorCookie);
```

#### Get Arquivo
```javascript
/* Busca do conteudo de arquivos internos */
JX.getArquivo ('/caminho/do/arquivo.txt')
   .then (conteudo => console.log (conteudo))
   .catch (erro => console.error (erro));
```

#### Get Parametro
```javascript
// {PERCSTCAT137SP: 90, mgearmazem.gerar.nf.impureza.codImpureza: 0, BASESNKPADRAO: 'IkRBVEFDUklBQ0FPOjA0LzA1LzIwMjMuQkFTRTpQQURSQU8uQkFOQ086T1JBQ0xFIg==', ASD: null}
JX.getParametro (['PERCSTCAT137SP', 'mgearmazem.gerar.nf.impureza.codImpureza', 'BASESNKPADRAO', 'ASD']).then (console.log);

// {123: null}
JX.getParametro ('123').then (console.log);

// {BALANCASP2600R: false, BL-SBR140-RS232: false, BALANCASATURNO: false, MODELOCPASEMENT: 0, TOPSCPASEMENTE: null, …}
JX.getParametro ().then (console.log);

// ERRO: Forneça o nome dos parametros a serem buscados como Texto ou Array de Textos!
JX.getParametro (5).then (console.log);

// ERRO: Os parametros informados devem ser Textos não vazios!
JX.getParametro (['']).then (console.log);

// ERRO: Os parametros informados devem ser Textos não vazios!
JX.getParametro (['ASD', 7]).then (console.log);

// ERRO: Forneça o nome dos parametros a serem buscados como Texto ou Array de Textos!
JX.getParametro (false).then (console.log);
```

## Considerações

- Alguns métodos são assíncronos e retornam Promises.
- Tratamento de erros deve ser implementado adequadamente.