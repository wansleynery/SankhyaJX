class JX {

    /***********************************************/
    // MANIPULADORES DE REQUISICAO
    /***********************************************/

    /**
     * Realiza requisicoes do tipo POST
     * 
     * @param { string }              url URL da requisicao
     * @param { any }               corpo Corpo da requisicao
     * @param { { headers: any } } opcoes Opcoes adicionais da requisicao
     * 
     * @returns                           Resposta da requisicao
     */
    static async post (url, corpo, { headers } = { headers: {} }) {
        
        let tipoCorpoRequisicao = '';
        let isJSON = true;

        if (headers) {
            tipoCorpoRequisicao = headers ['Content-Type'] ? String (headers ['Content-Type']) : tipoCorpoRequisicao;
            isJSON = tipoCorpoRequisicao.length < 1 || tipoCorpoRequisicao.includes ('json');

            headers ['Content-Type'] && delete headers ['Content-Type'];
            headers ['Content-Type'] = !isJSON ? tipoCorpoRequisicao : 'application/json; charset=UTF-8';
        }

        try {

            const resposta = await window.fetch.bind (window) (url, {
                headers,
                method  : 'POST',
                redirect: 'follow',
                body    : isJSON ? JSON.stringify (corpo) : corpo
            });

            return isJSON ? resposta.json () : resposta.text ();

        } catch (e) { console.error (e); }
    }

    /**
     * Realiza requisicoes do tipo GET
     * 
     * @param { string }              url URL da requisicao
     * @param { { headers: any } } opcoes Opcoes adicionais da requisicao
     * 
     * @returns                           Resposta da requisicao
     */
    static async get (url, { headers } = { headers: {} }) {
        
        let tipoCorpoRequisicao = '';
        let isJSON = true;

        if (headers) {
            tipoCorpoRequisicao = headers ['Content-Type'] ? String (headers ['Content-Type']) : tipoCorpoRequisicao;
            isJSON = tipoCorpoRequisicao.length < 1 || tipoCorpoRequisicao.includes ('json');

            headers ['Content-Type'] && delete headers ['Content-Type'];
            headers ['Content-Type'] = !isJSON ? tipoCorpoRequisicao : 'application/json; charset=UTF-8';
        }

        try {

            const resposta = await window.fetch.bind (window) (url, {
                headers,
                method  : 'GET',
                redirect: 'follow',
                mode    : 'no-cors'
            });

            return isJSON ? resposta.json () : resposta.text ();

        } catch (e) { console.error (e); }
    }



    /**
     * Realiza consultas ao servico de banco de dados
     * 
     * @param { string }    query Consulta a ser realizada
     * 
     * @returns { Promise <any> } Resposta da consulta
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
     * @param { any }                                               dados Dados para o processamento do botao
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
     * @returns                                                           Resposta da chamada remota
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
     * Salva o registro atual na base de dados (metodo interno)
     * 
     * @deprecated
     * 
     * @param { any }         dados Dados do registro a ser salvo
     * @param { string }  instancia Nome da Instancia a receber o registro a ser salvo
     * @param { any } chavePrimaria Chaves de identificacao do registro caso necessario forcar a atualizacao ou
     * qual pk o registro devera ter ao ser criado
     * 
     * @returns                     Resposta da requisicao de salvamento
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
     * @param { any }           dados 
     * @param { string }    instancia 
     * @param { any } chavesPrimarias 
     * 
     * @returns 
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
                    .title;
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
     * Opens the current frame in new tab
     * @version 6.0 Main implementation
     * @version 7.0 Optimization anf bug fix
     */
    static novaGuia (forcado = false) {

        if ((window.parent.parent.document.querySelector ('.Taskbar-container') && !forcado) || forcado) {
            Object.assign (document.createElement ('a'), { target: '_blank', href: window.location.href }).click ();
        }

    }


    static abrirPagina ({ resourceID, chavesPrimarias }) {

        const requisicao =
            `<serviceRequest serviceName="WorkspaceSP.openItemMenu">
                <requestBody>
                    <itemMenu resourceID="${ resourceID }"${
                        chavesPrimarias
                            ? ' pk="' + Buffer.from (JSON.stringify (chavesPrimarias), 'utf8').toString ('base64') + '"'
                            : ''
                    } />
                </requestBody>
            </serviceRequest>`

        JX.post (`${ JX.getUrl () }/mge/service.sbr?serviceName=WorkspaceSP.openItemMenu`, requisicao, {
                headers: { 'Content-Type': 'application/xml' }
            }
        ).then (resposta => {

            /* Eliminar a primeira linha da resposta com o cabecalho do XML */
            const dadosSemCabecalho = resposta.match (/(.*)\n(.*)/) [2];

            /* Pegar apenas o conteudo JSON da resposta do servidor */
            const dadosBrutos = dadosSemCabecalho.match (/(.*)<json><!\[CDATA\[(.*)\]\]><\/json>(.*)/);

            /* Converter o conteudo JSON para objeto */
            const jsonResposta = JSON.parse (dadosBrutos [2]);

            Object.assign (document.createElement ('a'), {
                target: '_blank',
                href: JX.getUrl (jsonResposta.onclick),
            }).click ();
        });

    }


    /**
     * Closes the current tab
     * @version 7.0 Main implementation
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
     * @param { string } path Caminho a ser adicionado a URL atual
     * @returns { string } A URL com o protocolo HTTPS ou HTTP
     */
    static getUrl (path) {
        return `${ window.location.origin }${ path ? '/' + path.replace ('/', '') : '' }`;
    }


    /**
     * Busca o valor do cookie desejado baseado no nome.
     * 
     * Sao tres retornos possiveis:
     * - Caso nao seja informado o nome, retorna todos os cookies.
     * - Caso seja informado o nome, porem nao exista, retorna string vazia.
     * - Caso seja informado o nome e exista, retorna o valor do cookie.
     * 
     * @param { string } cookieName Nome do cookie desejado
     * @returns { string } Conteudo do cookie desejado
     */
    static getCookie (cookieName) {

        const decodedCookie = decodeURIComponent (document.cookie);

        if (cookieName && cookieName.length) {
            const cookies = decodedCookie.split (';');

            for (let cookie of cookies) {

                let cookieIndex = cookie.split ('=') [0].trim ();

                if (cookieIndex === cookieName) {
                    return cookie.split ('=') [1];
                }

            }

            return '';
        }

        return decodedCookie;
    }


    /**
     * Busca o conteudo de um arquivo
     * @param { string } caminhoArquivo Caminho do arquivo a ser carregado
     * @returns { string } Conteudo do arquivo
     */
    static getArquivo (caminhoArquivo) {
        return JX.get (caminhoArquivo, {
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}