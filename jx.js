'use strict';

class JX {

    /***********************************************/
    // MANIPULADORES DE REQUISICAO
    /***********************************************/

    /**
     * Realiza requisicoes do tipo POST
     * 
     * @param { String } url                               URL da requisicao
     * @param { Object } corpo                             Corpo da requisicao
     * @param { { headers: Object, raw: boolean } } opcoes Opcoes adicionais da requisicao:
     * - **headers**: Cabecalho da requisicao (deixe vazio para chamadas padroes JSON)
     * - **raw**: Indica se a resposta deve ser retornada sem conversao do Fetch (padrao: false)
     * 
     * @returns { Promise <Object> }                       Resposta da requisicao
     */
    static async post (url, corpo, { headers, raw } = { headers: {}, raw: false }) {

        let isJSON = true;

        if (headers) {
            const cabecahoTipoOriginal = headers ['Content-Type'] ? String (headers ['Content-Type']) : 'application/json; charset=UTF-8';
            isJSON = headers ['Content-Type'] ? RegExp (/json/i).exec (headers ['Content-Type']) : isJSON;

            headers ['Content-Type'] && delete headers ['Content-Type'];
            headers ['Content-Type'] = cabecahoTipoOriginal;
        }

        try {

            let corpoRequisicaoFormatado = corpo;

            if (corpo && typeof corpo === 'object') {
                corpoRequisicaoFormatado = JSON.stringify (corpo);
            }

            const resposta = await window.fetch.bind (window) (url, {
                headers,
                method      : 'POST',
                redirect    : 'follow',
                credentials : 'include',
                body        : corpoRequisicaoFormatado
            });

            if (raw) {
                return resposta;
            }

            return isJSON ? resposta.json () : resposta.text ();

        } catch (e) { console.error (e); }
    }

    /**
     * Realiza requisicoes do tipo GET
     * 
     * @param { String } url                               URL da requisicao
     * @param { { headers: Object, raw: boolean } } opcoes Opcoes adicionais da requisicao:
     * - **headers**: Cabecalho da requisicao (deixe vazio para chamadas padroes JSON)
     * - **raw**: Indica se a resposta deve ser retornada sem conversao do Fetch (padrao: false)
     * 
     * @returns { Promise <Object> }                       Resposta da requisicao
     */
    static async get (url, { headers, raw } = { headers: {}, raw: false }) {

        let isJSON = true;

        if (headers) {
            const cabecahoTipoOriginal = headers ['Content-Type'] ? String (headers ['Content-Type']) : 'application/json; charset=UTF-8';
            isJSON = headers ['Content-Type'] ? RegExp (/json/i).exec (headers ['Content-Type']) : isJSON;

            headers ['Content-Type'] && delete headers ['Content-Type'];
            headers ['Content-Type'] = cabecahoTipoOriginal;
        }

        try {

            const resposta = await window.fetch.bind (window) (url, {
                headers,
                method      : 'GET',
                redirect    : 'follow',
                credentials : 'include',
                mode        : 'no-cors'
            });

            if (raw) {
                return resposta;
            }

            return isJSON ? resposta.json () : resposta.text ();

        } catch (e) { console.error (e); }
    }



    /**
     * Realiza consultas ao servico de banco de dados
     * 
     * @param { String } query               Consulta a ser realizada
     * 
     * @returns { Promise <Array <Object>> } Resposta da consulta
     * 
     * @example JX.consultar ('SELECT * FROM DUAL');
     */
    static async consultar (query) {
    
        function respostaConsulta (resposta) {
    
            let arrayResultado = [];
            let dados = typeof resposta === 'string' ? JSON.parse (resposta) : resposta;
    
            if (dados.data) {
                dados = dados.data.responseBody;
            }
            else if (dados.responseBody) {
                dados = dados.responseBody;
            }
    
            let nomes = dados.fieldsMetadata || [];
            let valores = dados.rows || [];

            if (valores.length) {
                valores.forEach (v => {
                    let obj = {};
                    nomes.forEach ((n, i) =>
                        obj [n.name] = v [i]
                    );
                    arrayResultado.push (obj);
                });
            }
    
            return arrayResultado;
        }

        query = query.replace (/(\r\n|\n|\r)/gm, '');
    
        const url = `${ window.location.origin }/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`;
        let dadosEnvio = `{ "serviceName": "DbExplorerSP.executeQuery", "requestBody": { "sql": "${ query }" } }`;
        dadosEnvio = JSON.parse (dadosEnvio);
    
        const requisicao = await JX.post (url, dadosEnvio);

        return respostaConsulta (requisicao);

    }



    /**
     * Realiza o acionamento remoto de um botao de acao
     * 
     * @param { any } dados                                               Dados para o processamento do botao
     * @param { { tipo: ['js', 'java', 'sql'], idBotao: number } } opcoes Opcoes de configuracao do acionamento remoto.
     * 
     * **tipo**: Se o botao eh em Javascript (JS), Java (JAVA) ou PL-SQL (SQL). Case-insensitive.
     * 
     * **idBotao**: ID do botao na tabela residente.
     * 
     * **entidade**: (SQL) Nome da Entidade que possui o Botao.
     * 
     * **nomeProcedure**: (SQL) Nome da Procedure a ser executada.
     * 
     * _Padrao_: `{ tipo: 'java', idBotao: 0 }`
     * 
     * @returns { Promise <Object> }                                      Resposta da chamada do botao
     */
    static acionarBotao (dados, { tipo, idBotao, entidade, nomeProcedure } = { tipo: 'java', idBotao: 0 }) {

        function converterParametro (dadosInternos) {
    
            let novosDados = {
                params: {
                    param: []
                }
            };

            Object.keys (dadosInternos).
                forEach (chave =>

                    novosDados.params.param.push ({
                        type: typeof dadosInternos [chave] === 'string' ? 'S': 'I',
                        paramName: chave,
                        $: dadosInternos [chave]
                    })

            );

            return novosDados;
        }

        let nomeServico = '';
        let dadosEnvio  = {};

        switch (tipo.toLowerCase ()) {
            case 'js': {
                nomeServico = 'ActionButtonsSP.executeScript';
                dadosEnvio  = {
                    serviceName: nomeServico,
                    requestBody: {
                        runScript: {
                            actionID: idBotao,
                            ...converterParametro (dados)
                        }
                    }
                };
                break;
            }
            case 'java': {
                nomeServico = 'ActionButtonsSP.executeJava';
                dadosEnvio = {
                    serviceName: nomeServico,
                    requestBody: {
                        javaCall: {
                            actionID: idBotao,
                            ...converterParametro (dados)
                        }
                    }
                };
                break;
            }
            case 'sql': {
                if (!entidade) {
                    console.error ('Entidade (parametro entidade) é necessária para a execução!'); return;
                }
                else if (!nomeProcedure) {
                    console.error ('Nome da procedure (parametro nomeProcedure) é necessária para a execução!'); return;
                }

                nomeServico = 'ActionButtonsSP.executeSTP';
                dadosEnvio = {
                    serviceName: nomeServico,
                    requestBody: {
                        stpCall: {
                            actionID    : idBotao,
                            rootEntity  : entidade,
                            procName    : nomeProcedure,
                            ...converterParametro (dados)
                        }
                    }
                }
                break;
            }
            default: break;
        }

        const url = `${ window.location.origin }/mge/service.sbr?serviceName=${ nomeServico }&outputType=json`;

        return JX.post (url, dadosEnvio);
    }



    /**
     * (METODO INTERNO) Salva o registro atual na base de dados 
     * 
     * @param { any } dados          Dados do registro a ser salvo
     * @param { String } instancia   Nome da Instancia a receber o registro a ser salvo
     * @param { any } chavePrimaria  Chaves de identificacao do registro caso necessario forcar a atualizacao ou
     * qual pk o registro devera ter ao ser criado
     * 
     * @returns { Promise <Object> } Resposta da requisicao de salvamento interno
     */
    static _salvar (dados, instancia, chavePrimaria) {

        function montarDadosEnvio (dadosInterno, instanciaInterna, chavePrimariaInterna) {

            let camposConvertidos = Object.
                                        keys (dadosInterno).
                                        reduce ((acumulador, chave) => ({
                                            ...acumulador,
                                            [ chave.toUpperCase () ]: {
                                                $: String (dadosInterno [ chave ])
                                            }
                                        }), {});

            let estruturaEnvio = {
                serviceName: 'CRUDServiceProvider.saveRecord',
                requestBody: {
                    dataSet: {
                        rootEntity: instanciaInterna,
                        includePresentationFields: 'N',
                        dataRow: {
                            localFields: camposConvertidos
                        },
                        entity: {
                            fieldset: {
                                list: Object.
                                        keys (dadosInterno).
                                        map  (nomeCampos =>
                                                nomeCampos.toUpperCase ()).
                                        join (',')
                            }
                        }
                    }
                }
            }

            if (chavePrimariaInterna) {

                let chavesPrimariasLocais = {};

                Object.
                    keys (chavePrimariaInterna).
                    forEach (chave =>
                        chavesPrimariasLocais = {
                            ...chavesPrimariasLocais,
                            [ chave.toUpperCase () ]: {
                                $: String (chavePrimariaInterna [ chave ])
                            }
                        }
                    );

                estruturaEnvio.requestBody.dataSet.dataRow.key = chavesPrimariasLocais;
            }

            return estruturaEnvio;
        }

        const url = `${
            window.location.origin
        }/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json`;
        const dadosEnvio = montarDadosEnvio (dados, instancia, chavePrimaria);

        return JX.post (url, dadosEnvio);

    }

    /**
     * Salva o registro atual na base de dados
     * 
     * @param { Object } dados           Dados do registro a ser salvo
     * @param { String } instancia       Nome da Instancia a receber o registro a ser salvo
     * @param { Object } chavesPrimarias Chaves de identificacao do registro
     * 
     * @returns { Promise <Object> }     Resposta da requisicao de salvamento
     * 
     * @example JX.salvar ({ DESCRICAO: 'DESCRICAO ALTERADA' }, 'MarcaProduto', { CODIGO: 999 });
     */
    static async salvar (dados, instancia, chavesPrimarias) {

        let respostas = [];

        if (chavesPrimarias && chavesPrimarias instanceof Array && chavesPrimarias.length) {

            for (let chavePrimaria of chavesPrimarias) {
                respostas.push (await JX._salvar (dados, instancia, chavePrimaria));
            }

        } else {
            return JX._salvar (dados, instancia, chavesPrimarias);
        }

        return respostas;
    }



    /**
     * Deleta o registro atual na base de dados
     * 
     * @param { String } instancia       Nome da Instancia a receber o registro a ser salvo
     * @param { Object } chavesPrimarias Chaves de identificacao do registro
     * 
     * @returns { Promise <Object> }     Resposta da requisicao de salvamento
     * 
     * @example JX.deletar ('MarcaProduto', { CODIGO: 999 });
     */
    static deletar (instancia, chavesPrimarias) {

        const url = `${ window.location.origin }/mge/service.sbr?serviceName=DatasetSP.removeRecord&outputType=json`;
        const dadosEnvio = {
            serviceName: 'DatasetSP.removeRecord',
            requestBody: {
                entityName: instancia,
                pks: chavesPrimarias instanceof Array ? chavesPrimarias : [ chavesPrimarias ]
            }
        }

        return JX.post (url, dadosEnvio);
    }





    /***********************************************/
    // MANIPULADORES DE PAGINA
    /***********************************************/

    /**
     * Remove o frame da página de BI
     * 
     * @param { { instancia: String, paginaInicial: String, opcoes: any } } configuracoes Configuracoes gerais da pagina
     * 
     * **instancia**: Nome exato do componente de BI
     * 
     * **paginaInicial**: URL (a partir da pasta raiz) e nome do arquivo da pagina inicial
     * 
     * **opcoes**: [opcional] Campos com valores a serem recebidos pela pagina
     * 
     * _Padrao_: `{ instancia: '', paginaInicial: 'app.jsp' }`
     * 
     * @example JX.removerFrame ({ instancia: 'TELA_HTML5', paginaInicial: 'paginas/entidade/index.jsp'}); // BI-SankhyaJS
     */
    static removerFrame ({ instancia, paginaInicial, ...opcoes } = { instancia: '', paginaInicial: 'app.jsp' }) {

        new Promise (resolve => {

            if (window.parent.document.getElementsByTagName ('body').length) {

                if (window.parent.document.querySelector ('div.gwt-PopupPanel.alert-box.box-shadow'))
                    window.parent.document.querySelector ('div.gwt-PopupPanel.alert-box.box-shadow')
                        .style.display = 'none';

                window.parent.document.getElementsByTagName ('body') [0].style.overflow = 'hidden';
            }

            if (window.parent.parent.document.getElementsByTagName ('body').length) {

                if (window.parent.parent.document.querySelector ('div.gwt-PopupPanel.alert-box.box-shadow'))
                    window.parent.parent.document.querySelector ('div.gwt-PopupPanel.alert-box.box-shadow')
                        .style.display = 'none';

                window.parent.parent.document.getElementsByTagName ('body') [0].style.overflow = 'hidden';
            }

            if (
                window.parent.document
                    .querySelector ('div.GI-BUHVBPVC > div > div > div > div > div > table > tbody > tr > td > div')
            ) {
                instancia = window.parent.document
                    .querySelector ('div.GI-BUHVBPVC > div > div > div > div > div > table > tbody > tr > td > div')
                    .textContent;
            }

            if (instancia && instancia.length > 0)  {
                JX.
                    consultar (`SELECT NUGDG FROM TSIGDG WHERE TITULO = '${ instancia }'`).
                    then (e => resolve ({ gadGetID: 'html5_z6dld', nuGdt: e [0].NUGDG, ...opcoes }));
            }
            else {
                resolve ({ gadGetID: 'html5_z6dld', nuGdt: 0, ...opcoes });
            }
        }).
        then (o =>
            setTimeout (() => {
                if (typeof window.parent.document.getElementsByClassName ('DashWindow') [0] != 'undefined') {

                    const opcoesUrl =
                        Object.
                            keys        (o).
                            filter      (item => !['params', 'UID', 'instance', 'nuGdg', 'gadGetID'].includes (item)).
                            map         (item => `&${ item }=${ o [item] }`).
                            join        ('');

                    const url = `/mge/html5component.mge?entryPoint=${ paginaInicial }&nuGdg=${ o.nuGdt }${ opcoesUrl }`

                    setTimeout (() =>
                        window.parent.document.getElementsByClassName ('dyna-gadget') [0].innerHTML =
                            `<iframe src="${ url }" class="gwt-Frame" style="width: 100%; height: 100%;"></iframe>`
                    , 500);

                    setTimeout (() => document.getElementsByClassName ('popupContent').length
                        ? document.getElementsByClassName ('popupContent') [0].parentElement.remove ()
                        : (() => { /**/ }) ()
                    , 20000);

                    setTimeout (() => (document.getElementById ('stndz-style').parentElement.parentElement)
                        .getElementsByTagName ('body') [0].style.overflow = 'hidden'
                    , 20000);
                }
            })    
        );
    }



    /**
     * Abre uma nova guia com a pagina atual
     * 
     * @param { boolean } forcado [opcional] Forca a abertura da nova guia
     * 
     * @example JX.novaGuia ();
     */
    static novaGuia (forcado = false) {

        if ((window.parent.parent.document.querySelector ('.Taskbar-container') && !forcado) || forcado) {
            Object.assign (document.createElement ('a'), { target: '_blank', href: window.location.href }).click ();
        }

    }



    /**
     * Abre uma pagina dentro do Sankhya-W.
     * 
     * - Se o resourceID nao existir, o sistema informara que a tela nao existe.
     * - Se as chaves primarias nao forem informadas, a tela sera aberta na pagina inicial.
     * - Se existirem chaves primarias, mas nao forem encontradas, a tela ssera aberta como visualizacao de um registro vazio (para inclusao)
     * - Se existirem chaves primarias e forem encontradas, a tela sera aberta no registro encontrado.
     * 
     * @param { String } resourceID      ID do recurso a ser aberto
     * @param { Object } chavesPrimarias Chaves de identificacao do registro
     * 
     * @example JX.abrirPagina ('br.com.sankhya.core.cad.marcas', { CODIGO: 999 });
     */
    static abrirPagina (resourceID, chavesPrimarias) {

        let url = JX.getUrl (`/mge/system.jsp#app/%resID`);
        url = url.replace ('%resID', btoa (resourceID));
    
        if (chavesPrimarias) {

            let body = {};

            Object.keys (chavesPrimarias).forEach (function (chave) {
                body [chave] = isNaN (chavesPrimarias [chave])
                    ? String (chavesPrimarias [chave])
                    : Number (chavesPrimarias [chave])
            });

            url = url.concat (`/${ btoa (JSON.stringify (body)) }`);

        }

        Object.assign (document.createElement ('a'), {
            target: '_top',
            href: url
        }).click ();

    }



    /**
     * Fecha a pagina atual.
     * 
     * Ele verifica se a pagina atual esta dentro do Sankhya-W para fechar, senao ele fecha a aba do navegador.
     */
    static fecharPagina () {
        if (window.parent.parent.document.querySelector ('.Taskbar-container')) {
            window.parent.parent.document.querySelector (
                'li.ListItem.AppItem.AppItem-selected div.Taskbar-icon.icon-close').click ();
        } else {
            window.close ();
        }
    }





    /***********************************************/
    // RETORNOS DE VALORES
    /***********************************************/

    /**
     * Retorna a URL atual da pagina
     * 
     * @param { String } path Caminho a ser adicionado a URL atual
     * 
     * @returns { String }    A URL com o protocolo HTTPS ou HTTP
     */
    static getUrl (path) {
        return `${ window.location.origin }${ path ? '/' + path.replace ('/', '') : '' }`;
    }



    /**
     * Busca o valor do cookie desejado baseado no nome.
     * 
     * Sao tres retornos possiveis:
     * - Caso nao seja informado o nome, retorna todos os cookies.
     * - Caso seja informado o nome, porem nao exista, retorna String vazia.
     * - Caso seja informado o nome e exista, retorna o valor do cookie.
     * 
     * @param { String } nome Nome do cookie desejado
     * 
     * @returns { String }    Conteudo do cookie desejado
     */
    static getCookie (nome) {

        const cookiesDecodificado = decodeURIComponent (document.cookie);

        if (nome && typeof nome === 'string' && nome.length) {
            const cookies = cookiesDecodificado.split (';');

            for (let cookie of cookies) {

                let [ nomeCookie, valorCookie ] = cookie.split ('=');

                if (nomeCookie.trim () === nome) {
                    return valorCookie;
                }

            }

            return '';
        }

        return cookiesDecodificado;
    }



    /**
     * Busca o conteudo de um arquivo
     * 
     * @param { String } caminhoArquivo Caminho do arquivo a ser carregado
     * 
     * @returns { String }              Conteudo do arquivo
     */
    static getArquivo (caminhoArquivo) {
        return JX.get (caminhoArquivo, {
            headers: { 'Content-Type': 'text/plain' }
        });
    }



    /**
     * (METODO INTERNO) Retorna um array com o nome/chave e o valor dos parametros informados
     * 
     * @param { Object } objeto                            Objeto a ser convertido nas tuplas dos parametros
     * 
     * @returns { Array <Array <String, Object, String>> } Tuplas dos parametros
     */
    static _converterTuplas (respostaParametros) {

        let tuplas = [];

        function recuperarValorNodo (nodo) {

            let valor = null;
        
            switch (nodo.type) {
                case 'L': {
                    valor = nodo.value === 'true';
                    break;
                }
                case 'I':
                case 'F': {
                    valor = Number (nodo.value);
                    break;
                }
                case 'T': {
                    valor = nodo.value;
                    break;
                }
                case 'C': {
                    const opcoes = (nodo.listContent || '').split ('\n');
                    const indice = parseInt (nodo.value, 10);
                    valor = opcoes [indice] || null;
                    break;
                }
                case 'D': {
                    valor = nodo.value ? new Date (
                        nodo.value.subString (6, 10),
                        (Number (nodo.value.subString (3, 5)) - 1).toString (),
                        nodo.value.subString (0, 2)
                    ) : null;
                    break;
                }
            }
        
            return valor;
        
        }
        
        function construirChavePai (nodo, chavePai, chave) {
            return chave === 'nodeName' ? chavePai + nodo [chave] + '.' : chavePai;
        }
        
        function iterarArray (array, chavePai, tuplasInternas) {
            array.forEach (elemento => iterarObjeto (elemento, chavePai, tuplasInternas));
        }

        function iterarObjeto (nodo, chavePai, tuplasInternas) {

            if (Array.isArray (nodo)) {

                iterarArray (nodo, chavePai, tuplasInternas);

            } else if (nodo && typeof nodo === 'object') {

                if (nodo.hasOwnProperty ('key') && nodo.hasOwnProperty ('value')) {

                    let valor = recuperarValorNodo (nodo);
                    let nomeModular = nodo.name;
                    tuplasInternas.push ([chavePai + nodo.key, valor, nomeModular]);

                } else {

                    Object.keys (nodo).forEach (chave => {
                        if (chave === 'node' || chave === 'nodeName') {
                            const novaChavePai = construirChavePai (nodo, chavePai, chave);
                            iterarObjeto (nodo [chave], novaChavePai, tuplasInternas);
                        }
                    });

                }
            }
        }

        iterarObjeto (respostaParametros.node, '', tuplas);
        
        return tuplas;

    }

    /**
     * (METODO INTERNO) Retorna um objeto com o array das tuplas dos parametros
     * 
     * @param { Array <Array <String, Object, String>> } parametrosEncontrados Tuplas dos parametros
     * @param { Array <String> } parametrosAProcurar                           Parametros a serem procurados
     * @param { boolean } isListagemTotal                                      Indica se a listagem eh de todos os parametros     * 
     * 
     * @returns { Object }                                                     Objeto com os parametros encontrados
     */
    static _montagemSerializacaoParametros (parametrosEncontrados, parametrosAProcurar, isListagemTotal = false) {

        const retornoSerializado = {};
        const arrayNormalizado = parametrosEncontrados.flat (1);
    
        if (isListagemTotal) {
    
            for (const element of arrayNormalizado) {
    
                const nomeParametro  = element [0];
                const valorParametro = element [1];
    
                retornoSerializado [nomeParametro] = valorParametro;
    
            }
    
        } else {
    
            for (const nomeParametro of parametrosAProcurar) {
            
                const parametro = arrayNormalizado.filter (item => {
    
                    const nomeParametroEncontrado   = item [0];
                    const moduloParametroEncontrado = item [2];
    
                    return [ nomeParametroEncontrado, moduloParametroEncontrado ].includes (nomeParametro);
    
                }) [0];
    
                if (!parametro || parametro [1] === null || parametro [1] === undefined || parametro [1] === '') {
                    retornoSerializado [nomeParametro] = null;
                } else {
                    retornoSerializado [nomeParametro] = parametro [1];
                }
    
            }
    
        }
    
        return retornoSerializado;
    
    }

    /**
     * Retorna o valor do parametro desejado.
     * 
     * Os parametros podem ser buscados de forma individual ou em lote com seu nome ou chave ('br.com...').
     * Buscamos todos os parametros de acordo com essa consulta e retornamos apenas o que tenha o valor exato
     * do nome ou chave informado. O valor retornado eh convertido de acordo com o tipo do parametro.
     * - Se o parametro nao for encontrado, retorna `null`.
     * - Parametros do tipo `C` (_Lista de Opcoes_) retornam o valor da opcao selecionada da lista (nao o indice).
     * - Parametros do tipo `D` (_Data_) retornam um objeto `Date`.
     * - Parametros do tipo `L` (_Booleano_) retornam `true` ou `false` de acordo com `S` (Sim) ou `N` (Nao).
     * - Parametros do tipo `I` (_Inteiro_) retornam um `Number` inteiro.
     * - Parametros do tipo `F` (_Decimal_) retornam um `Number` decimal.
     * - Parametros do tipo `T` (_Texto_) retornam uma `String`.
     * 
     * @param { String | Array <String> } nomesParametros Nome do parametro a ser buscado
     * 
     * @returns { Promise <Object> }                      Objeto com os parametros encontrados
     * 
     * @example JX.getParametro (['PERCSTCAT137SP', 'mgearmazem.gerar.nf.impureza.codImpureza', 'BASESNKPADRAO', 'ASD']).then (console.log);
     */
    static async getParametro (nomesParametros = '') {
    
        /* Validacoes */
            if (nomesParametros === null || nomesParametros === undefined) {
                nomesParametros = '';
            }

            const isTipoNomeParametroValido = (
                typeof nomesParametros === 'string'
                || Array.isArray (nomesParametros)
            );
            if (!isTipoNomeParametroValido) {
                throw new Error ('Forneça o nome dos parametros a serem buscados como Texto ou Array de Textos!');
            }
    
            const isAlgumNomeInvalido = (
                Array.isArray (nomesParametros)
                && !nomesParametros.every (item =>
                    item != null
                    && typeof item === 'string'
                    && item.length
                )
            );
            if (isAlgumNomeInvalido) {
                throw new Error ('Os parametros informados devem ser Textos não vazios!');
            }
        /* */
    
        const isListagemTotal     = nomesParametros.length === 0;
        nomesParametros           = Array.isArray (nomesParametros) && isListagemTotal ? '' : nomesParametros;
        const isParametroUnico    = typeof nomesParametros === 'string' || nomesParametros.length === 0;
        const parametrosAProcurar = isParametroUnico ? [ nomesParametros ] : nomesParametros;
    
        const nomeServico = `ManutencaoPreferenciasSP.getParametrosComoEstrutura`;
        const url         = `${ window.location.origin }/mge/service.sbr?serviceName=${ nomeServico }&outputType=json`;
        const dadosEnvio  = {
            serviceName: nomeServico,
            requestBody: {
                param: {
                    value: ""
                }
            }
        };
    
        const requisicoes = parametrosAProcurar.map (async parametro => {
    
            dadosEnvio.requestBody.param.value = parametro;
    
            const resposta = await JX.post (url, dadosEnvio);
            const parametrosEncontrados = JX._converterTuplas (resposta.responseBody.root) || [];
    
            return parametrosEncontrados;
    
        });

        const parametros = (await Promise.all (requisicoes));
        return JX._montagemSerializacaoParametros (parametros, parametrosAProcurar, isListagemTotal);
    
    }



    /**
     * (METODO INTERNO) Formata a requisição para chamada de serviço.
     * 
     * @param { String } url         URL do serviço.
     * @param { String } nomeServico Nome do serviço.
     * @param { Object } dados       Dados da requisição.
     * @param { Boolean } isJSON     Indica se a requisição é do tipo JSON.
     * 
     * @returns { [string, string] } URL formatada e corpo da requisição.
     */
    static _formatarRequisicaoChamadaServico (url, nomeServico, dados, isJSON = true) {

        let corpoRequisicao = null;

        switch (true) {

            /* Caso seja uma chamada JSON */
                case (isJSON && dados && typeof dados === 'object'): {
                    url = `${ url }&outputType=json`;
                    corpoRequisicao = JSON.stringify ({
                        serviceName: nomeServico,
                        requestBody: dados
                    });
                    break;
                }
                case (isJSON && dados && typeof dados === 'string'): {
                    url = `${ url }&outputType=json`;
                    corpoRequisicao = dados;
                    break;
                }
            /* */

            default: {
                corpoRequisicao = dados;
                break;
            }
        }

        return [ url, corpoRequisicao ];
    }

    /**
     * (METODO INTERNO) Formata a URL para chamada de serviço.
     * 
     * @param { String } nomeModulo            Nome do módulo do serviço.
     * @param { String } nomeServico           Nome do serviço.
     * @param { String } aplicacaoRequisitante Nome da aplicação requisitante.
     * 
     * @returns { String }                     URL formatada para o serviço.
     */
    static _formatarUrlChamadaServico (
        /** @type { String } */ nomeModulo,
        /** @type { String } */ nomeServico,
        /** @type { String } */ aplicacaoRequisitante
    ) {

        const token                  = JX.getCookie ('JSESSIONID').replace (/\..*/, '');
        let url                      = `${ window.location.origin }/${ nomeModulo }/service.sbr?serviceName=${ nomeServico }&mgeSession=${ token }`;

        const complementoUrl         = `&counter=1&preventTransform=false`;
        /*____________________________TELA ACESSORA_____________RESOURCE ID */
        const aplicacaoUrlComercial  = [`SelecaoDocumento`,       `br.com.sankhya.mgecom.mov.selecaodedocumento` ];
        const aplicacaoUrlFinanceiro = [`MovimentacaoFinanceira`, `br.com.sankhya.fin.cad.movimentacaoFinanceira`];
        const aplicacaoUrlServico    = [`ConsultaOS`,             `br.com.sankhya.os.mov.OrdemServico`           ];

        switch (nomeModulo) {
            case 'mgecom': {
                url = `${ url }${ complementoUrl }&application=${ aplicacaoUrlComercial [0] }&resourceID=${ aplicacaoUrlComercial [1] }`;
                break;
            }
            case 'mgefin': {
                url = `${ url }${ complementoUrl }&application=${ aplicacaoUrlFinanceiro [0] }&resourceID=${ aplicacaoUrlFinanceiro [1] }`;
                break;
            }
            case 'mgeos': {
                url = `${ url }${ complementoUrl }&application=${ aplicacaoUrlServico [0] }&resourceID=${ aplicacaoUrlServico [1] }`;
                break;
            }
            default: {
                url = `${ url }${ complementoUrl }&application=${ aplicacaoRequisitante }`;
                break;
            }
        }

        return url;

    }

    /**
     * Chama um serviço específico no backend Sankhya.
     * Ele foi implementado para substituir o servico nativo ServiceProxy.callService e ser agnostico a framework.
     * 
     * Os modulos implementados atualmente sao:
     * - mge    (Padrao)
     * - mgecom (Comercial)
     * - mgefin (Financeiro)
     * - mgeos  (Contratos e Servico)
     * 
     * Caso utilize um modulo nao implementado, informe a aplicacao nos dados adicionais.
     * 
     * @param { String } nomeServico     Nome do serviço a ser chamado.
     * @param { Object } dados           Dados a serem enviados na requisição.
     * @param { Object } dadosAdicionais Dados adicionais para a requisição.
     * - **aplicacao**: Aplicacao requisitante do serviço. _Padrao_: `workspace`
     * - **cabecalho**: Cabecalho da requisicao. _Padrao_: `{ 'Content-Type': 'application/json; charset=UTF-8' }`
     * 
     * @returns { Promise <Object> }     Resposta do serviço.
     * 
     * @example
     * JX.chamarServico ("mgecom@admin.getVersao", null).then (console.log);
     */
    static async chamarServico (nomeServico, dados, dadosAdicionais = {
        aplicacao: 'workspace',
        cabecalho: {
            'Content-Type': 'application/json; charset=UTF-8'
        }
    }) {

        let nomeModulo            = 'mge';
        let aplicacaoRequisitante = 'workspace';
        let corpoRequisicao       = null;
        let cabecalhoRequisicao   = {};

        /* Validacoes */
            if (
                !nomeServico
                || typeof nomeServico !== 'string'
                || nomeServico.length < 1
            ) {
                throw new Error ('O serviço deve ser informado!');
            }
        /* */

        /* Desmembramento do nome do servico */
            if (nomeServico.includes ("@")) {
                [ nomeModulo, nomeServico ] = nomeServico.split ("@");
            }
        /* */

        /* Desmembramento dos dados adicionais */
            if (dadosAdicionais) {

                /* Caso seja uma chamada de um modulo nao implementado (mgecom, mgefin, mgeos) */
                aplicacaoRequisitante = dadosAdicionais.aplicacao || aplicacaoRequisitante;

                /* Para chamadas em XML, obrigatoriamente deve ser informado o cabecalho da requisicao */
                cabecalhoRequisicao   = {
                    ...(dadosAdicionais.cabecalho ? dadosAdicionais.cabecalho : {})
                };

            }
        /* */

        const isChamadaJson = (dados && (
            (typeof dados === 'string' && !dados.startsWith ('<'))
            || typeof dados === 'object'
        ));
        const cabecalhoFinal = {
            ...cabecalhoRequisicao,
            'Content-Type': isChamadaJson ? 'application/json; charset=UTF-8' : 'text/xml; charset=UTF-8'
        };

        let url                  = JX._formatarUrlChamadaServico (nomeModulo, nomeServico, aplicacaoRequisitante);
        [ url, corpoRequisicao ] = JX._formatarRequisicaoChamadaServico (url, nomeServico, dados, isChamadaJson);

        const resposta = await JX.post (url, corpoRequisicao, {
            headers: cabecalhoFinal,
            raw: true
        });
        if (!resposta.ok) {
            throw new Error (`[JX] Erro não identificado.`);
        }

        const dadosResposta = isChamadaJson ? await resposta.json () : await resposta.text ();
        if ([0, 3].includes (dadosResposta.status)) {
            throw dadosResposta;
        }

        if ([2, 4].includes (dadosResposta.status)) {
            console.warn (`[JX] ${ dadosResposta.statusMessage }`);
        }

        return dadosResposta;

    }

}
