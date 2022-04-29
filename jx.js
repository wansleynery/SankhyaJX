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
            headers ['Content-Type'] = !isJSON ? tipoCorpoRequisicao : 'application/json';
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
            headers ['Content-Type'] = !isJSON ? tipoCorpoRequisicao : 'application/json';
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

        const url = `${ window.location.origin }/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`;
        let dadosEnvio = `{ "serviceName": "DbExplorerSP.executeQuery", "requestBody": { "sql": "${ query }" } }`;
        dadosEnvio = JSON.parse (dadosEnvio);

        const requisicao = await JX.post (url, dadosEnvio);

        return respostaConsulta (requisicao);

    }



    /**
     * Realiza o acionamento remoto de um botao de acao
     * 
     * @param { any }                                        dados Dados para o processamento do botao
     * @param { { tipo: ['js', 'java'], idBotao: number } } opcoes Opcoes de configuracao para o acionamento remoto.
     * 
     *                                                             **tipo**: Se o botao eh em Javascript (JS) ou Java (JAVA)
     * 
     *                                                             **idBotao**: ID do botao na tabela residente,
     * 
     *                                                             **resourceID**: Tela a qual pertence o botao.
     * 
     *                                                             _Padrao_: `{ tipo: 'js', idBotao: 0 }`
     * 
     * @returns                                                    Resposta da chamada remota
     */
    static acionarBotao (dados, { tipo, idBotao, resourceID } = { tipo: 'java', idBotao: 0, resourceID: '' }) {

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
            default: break;
        }

        const url = `${
            window.location.origin
        }/mge/service.sbr?serviceName=${ nomeServico }&outputType=json&resourceID=${ resourceID }`;

        return JX.post (url, dadosEnvio);
    }



    /**
     * Salva (cria ou atualiza) o registro atual na base de dados
     * 
     * @param { any }                   dados Dados do registro a ser salvo
     * @param { string }            instancia Nome da Instancia a receber o registro a ser salvo
     * @param { Array <any> } chavesPrimarias Chaves de identificacao do registro (vazio para criar um novo registro)
     * 
     * @returns 
     */
    static async salvar (dados, instancia, chavesPrimarias) {

        function _salvar (dadosCentrais, instanciaCentral, chavePrimariaCentral) {

            function montarDadosEnvio (dadosInterno, instanciaInterna, chavePrimariaInterna) {

                let camposConvertidos = Object.
                                            keys (dadosInterno).
                                            reduce ((acumulador, chave) => ({
                                                ...acumulador,
                                                [ chave.toUpperCase () ]: {
                                                    $: String (dadosInterno [ chave ])
                                                }
                                            }), {});

                var estruturaEnvio = {
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

            const url = `${ window.location.origin }/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json`;
            const dadosEnvio = montarDadosEnvio (dadosCentrais, instanciaCentral, chavePrimariaCentral);

            return JX.post (url, dadosEnvio);

        }

        let respostas = [];

        if (chavesPrimarias && chavesPrimarias instanceof Array && chavesPrimarias.length) {

            for (let chavePrimaria of chavesPrimarias) {
                respostas.push (await _salvar (dados, instancia, chavePrimaria));
            }

        } else {
            return _salvar (dados, instancia, chavesPrimarias);
        }

        return respostas;
    }

    /**
     * Deleta o registro atual na base de dados
     * 
     * @param { String }            instancia Nome da Instancia a receber o registro a ser salvo
     * @param { Array <any> } chavesPrimarias Chaves de identificacao do registro a ser deletado
     * 
     * @returns                               Resposta da requisicao de deletao
     */
    static async deletar (instancia, chavesPrimarias) {

        function _deletar (instanciaInterna, chavesPrimariasInterna) {

            const url = `${ window.location.origin }/mge/service.sbr?serviceName=DatasetSP.removeRecord&outputType=json`;
            const dadosEnvio = {
                serviceName: 'DatasetSP.removeRecord',
                requestBody: {
                    entityName: instanciaInterna,
                    pks: [ chavesPrimariasInterna ]
                }
            }

            return JX.post (url, dadosEnvio);
        }

        let respostas = [];

        if (chavesPrimarias && chavesPrimarias instanceof Array && chavesPrimarias.length) {

            for (let chavePrimaria of chavesPrimarias) {
                respostas.push (await _deletar (instancia, chavePrimaria));
            }

        } else {
            return _deletar (instancia, chavesPrimarias);
        }

        return respostas;
    }





    /***********************************************/
    // MANIPULADORES DE PAGINA
    /***********************************************/

    /**
     * Remove o frame de filtro para a tela em HTML5 no Componente de BI
     * 
     * @param { String | { instance: String, initialPage: String, params: any | undefined, UID: number, nuGdt: number } } options Informacoes para a remocao do frame
     */
    static removerFrame (options = { instance: '', initialPage: 'app.jsp', params: undefined, UID: 0, nuGdt: 0 }) {

        function validar (condicao, execucao) { if (condicao) execucao (); }

        new Promise (resolve => {

            if (window.parent.document.getElementsByTagName ('body').length) {

                validar (window.parent.document.querySelector ('div.gwt-PopupPanel.alert-box.box-shadow'), () =>
                    window.parent.document
                        .querySelector ('div.gwt-PopupPanel.alert-box.box-shadow').style.display = 'none'
                );

                window.parent.document.getElementsByTagName ('body') [0].style.overflow = 'hidden';
            }

            if (window.parent.parent.document.getElementsByTagName ('body').length) {

                validar (window.parent.parent.document.querySelector ('div.gwt-PopupPanel.alert-box.box-shadow'), () =>
                    window.parent.parent.document
                        .querySelector ('div.gwt-PopupPanel.alert-box.box-shadow').style.display = 'none'
                );

                window.parent.parent.document.getElementsByTagName ('body') [0].style.overflow = 'hidden';
            }

            let instance = "";

            if (
                window.parent.document
                    .querySelector ('div.GI-BUHVBPVC > div > div > div > div > div > table > tbody > tr > td > div')
            ) {
                instance = window.parent.document
                    .querySelector ('div.GI-BUHVBPVC > div > div > div > div > div > table > tbody > tr > td > div')
                    .title;
            }
            else {
                instance = typeof options === 'string' ? options : options.instance;
            }

            if (instance.length > 0)  {
                JX.
                    consultar (`SELECT NUGDG FROM TSIGDG WHERE TITULO = '${ instance }'`).
                    then (e => resolve ({
                        ...(typeof options === 'string' ? {} : options),
                        gadGetID: 'html5_z6dld',
                        params: undefined,
                        nuGdt: e [0].NUGDG
                    }));
            }
            else {
                resolve ({
                    ...(typeof options === 'string' ? {} : options),
                    gadGetID: 'html5_z6dld',
                    params: undefined,
                    nuGdt: options.nuGdt
                });
            }
        }).
        then (opt =>
            setTimeout (() => {
                if (typeof window.parent.document.getElementsByClassName ('DashWindow') [0] != 'undefined') {

                    const urlOptions =
                        Object.
                            keys        (opt).
                            filter      (item => !['params', 'UID', 'instance', 'nuGdg', 'gadGetID'].includes (item)).
                            map         (item => `&${ item }=${ opt [item] }`).
                            join        ('');

                    const entryPoint = options.initialPage ? options.initialPage : 'app.jsp';
                    const source = `/mge/html5component.mge?entryPoint=${
                        entryPoint
                    }&nuGdg=${ opt.nuGdt }${ urlOptions }${ opt.params ? '&params=' + window.atob (opt.params) : '' }`;

                    setTimeout (() =>
                        window.parent.document.getElementsByClassName ('dyna-gadget') [0].innerHTML =
                            `<iframe src="${ source }" class="gwt-Frame" style="width: 100%; height: 100%;"></iframe>`
                        , 500);
                        setTimeout (() =>
                            document.getElementsByClassName ('popupContent').length
                                ? document.getElementsByClassName ('popupContent') [0].parentElement.remove ()
                                : (() => { /**/ }) ()
                        , 30000);
                        setTimeout (() => (
                            document.getElementById ('stndz-style').parentElement.parentElement)
                                .getElementsByTagName ('body') [0].style.overflow = 'hidden'
                        , 30000);
                }
            })    
        );
    }



    /**
     * Abre a pagina atual em uma nova aba (guia)
     * 
     * @param { Boolean } forcado Obriga a abertura da pagina via evento manual
     */
    static novaGuia (forcado = false) {
        if ((window.parent.parent.document.querySelector ('.Taskbar-container') && !forcado) || forcado) {
            Object.assign (document.createElement ('a'), { target: '_blank', href: window.location.href }).click ();
        }
    }



    /**
     * Abre uma pagina
     * 
     * @param { String }      resourceID Id da pagina a ser aberta
     * @param { String } chavesPrimarias Valores de chaves primarias a serem passadas para a tela
     */
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
     * @param { String }        path Caminho opcional a ser adicionado a URL atual
     * 
     * @returns { Promise <String> } A URL com o protocolo HTTPS ou HTTP
     */
    static async getUrl (path = undefined) {
        return Promise.resolve (
            `${ window.location.origin }${ path ? '/' + path.replace (/^[\/]+/, '') : '' }`
        );
    }


    /**
     * Busca o valor do cookie desejado baseado no nome.
     * 
     * Sao tres retornos possiveis:
     * - Caso nao seja informado o nome, retorna todos os cookies.
     * - Caso seja informado o nome, porem nao exista, retorna string vazia.
     * - Caso seja informado o nome e exista, retorna o valor do cookie.
     * 
     * @param { String }  cookieName Nome do cookie desejado
     * 
     * @returns { Promise <String> } Conteudo do cookie desejado
     */
    static async getCookie (cookieName) {

        const decodedCookie = decodeURIComponent (document.cookie);

        if (cookieName && cookieName.length) {
            const cookies = decodedCookie.split (';');

            for (let cookie of cookies) {

                let cookieIndex = cookie.split ('=') [0].trim ();

                if (cookieIndex === cookieName) {
                    return cookie.split ('=') [1];
                }

            }

            return Promise.resolve ('');
        }

        return Promise.resolve (decodedCookie);
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
}
