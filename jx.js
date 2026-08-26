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
     * @param { { headers: Object=, raw: boolean= } } opcoes Opcoes adicionais da requisicao:
     * - **headers**: Cabecalho da requisicao (deixe vazio para chamadas padroes JSON)
     * - **raw**: Indica se a resposta deve ser retornada sem conversao do Fetch (padrao: false)
     *
     * @returns { Promise <any> }                          Resposta da requisicao
     */
    static async post (
        /** @type { String } */ url,
        /** @type { Object } */ corpo,
        /** @type { { headers: Object=, raw: boolean= } } */ { headers, raw } = { headers: {}, raw: false }
    ) {

        headers = { ...(headers ?? {}) };
        const tipo = headers ['Content-Type'] ? String (headers ['Content-Type']) : 'application/json; charset=UTF-8';
        headers ['Content-Type'] = tipo;
        const isJSON = /json/i.test (tipo);

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
     * @param { { headers: Object=, raw: boolean= } } opcoes Opcoes adicionais da requisicao:
     * - **headers**: Cabecalho da requisicao (deixe vazio para chamadas padroes JSON)
     * - **raw**: Indica se a resposta deve ser retornada sem conversao do Fetch (padrao: false)
     *
     * @returns { Promise <any> }                          Resposta da requisicao
     */
    static async get (
        /** @type { String } */ url,
        /** @type { { headers: Object=, raw: boolean= } } */ { headers, raw } = { headers: {}, raw: false }
    ) {

        headers = { ...(headers ?? {}) };
        const tipo = headers ['Content-Type'] ? String (headers ['Content-Type']) : 'application/json; charset=UTF-8';
        headers ['Content-Type'] = tipo;
        const isJSON = /json/i.test (tipo);

        try {

            const resposta = await window.fetch.bind (window) (url, {
                headers,
                method      : 'GET',
                redirect    : 'follow',
                credentials : 'include'
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
     * @returns { Promise <Array <any>> } Resposta da consulta
     *
     * @example JX.consultar ('SELECT * FROM DUAL');
     */
    static async consultar (
        /** @type { String } */ query
    ) {

        function respostaConsulta (/** @type { any } */ resposta) {

            let arrayResultado = [];
            let dados = typeof resposta === 'string' ? JSON.parse (resposta) : resposta;
            // noinspection JSUnresolvedVariable
            dados = dados?.data?.responseBody ?? dados?.responseBody ?? dados;

            let nomes = dados?.fieldsMetadata || [];
            let valores = dados?.rows || [];

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

        query = query.replace (/\s*(?:\r\n|\n|\r)\s*/g, ' ').trim ();

        const url = `${ window.location.origin }/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`;
        const dadosEnvio = {
            serviceName: 'DbExplorerSP.executeQuery',
            requestBody: { sql: query }
        };

        const requisicao = await JX.post (url, dadosEnvio);

        return respostaConsulta (requisicao);

    }



    /**
     * Executa uma consulta SQL diretamente no serviço ExecQuerySP.execQuery sem a necessidade de permissão de acesso
     * ao DbExplorerSP.executeQuery e ao Consolidador de Dados.
     *
     * @param { String } query               Consulta SQL a ser executada
     *
     * @returns { Promise <Array <any>> } Resultado da consulta, retornando um array de objetos
     *
     * @example JX.executarConsulta ('SELECT * FROM TGFMAR WHERE CODIGO IN (1, 2, 3)');
     */
    static async executarConsulta (
        /** @type { String } */ query
    ) {

        function respostaConsulta (/** @type { any } */ resposta) {

            let dados = typeof resposta === 'string' ? JSON.parse (resposta) : resposta;

            // desce até responseBody
            // noinspection JSUnresolvedVariable
            dados = dados?.data?.responseBody ?? dados?.responseBody ?? dados;

            // helper mínimo: objeto -> [obj], null/undefined -> []
            const paraArray = alvo => Array.isArray (alvo) ? alvo : (alvo ? [alvo] : []);

            // protege entity/line e normaliza
            const linhas = paraArray (dados?.entity?.line ?? []);

            // mapeia colunas (também normalizadas) para { nome: valor }
            return linhas.map (linha => {
                const colunas = paraArray (linha?.column);
                return Object.fromEntries (colunas.map (c => [c.name, c.value ?? null]));
            });

        }

        query = query.replace (/\s*(?:\r\n|\n|\r)\s*/g, ' ').trim ();

        const url = `${ window.location.origin }/mge/service.sbr?serviceName=ExecQuerySP.execQuery&outputType=json`;
        const dadosEnvio = {
            serviceName: 'ExecQuerySP.execQuery',
            requestBody: { querydata: { query } }
        };

        const requisicao = await JX.post (url, dadosEnvio);
        return respostaConsulta (requisicao);

    }



    /**
     * Realiza o acionamento remoto de um botao de acao
     *
     * @param { any } dados                                               Dados para o processamento do botao
     * @param { { tipo: String, idBotao: number, entidade: String=, nomeProcedure: String= } } opcoes
     * Opcoes de configuracao do acionamento remoto.
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
     * @returns { Promise <any> }                                         Resposta da chamada do botao
     */
    static acionarBotao (
        /** @type { any } */ dados,
        /** @type { { tipo: String, idBotao: number, entidade: String=, nomeProcedure: String= } } */
        { tipo, idBotao, entidade, nomeProcedure } = { tipo: 'java', idBotao: 0 }
    ) {

        function converterParametro (/** @type { any } */ dadosInternos) {

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
                    console.error ('Entidade (parametro entidade) é necessária para a execução!');
                    return Promise.resolve ();
                }
                else if (!nomeProcedure) {
                    console.error ('Nome da procedure (parametro nomeProcedure) é necessária para a execução!');
                    return Promise.resolve ();
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
     * @returns { Promise <any> } Resposta da requisicao de salvamento interno
     */
    static _salvar (
        /** @type { any } */    dados,
        /** @type { String } */ instancia,
        /** @type { any } */    chavePrimaria
    ) {

        function montarDadosEnvio (
            /** @type { any } */    dadosInterno,
            /** @type { String } */ instanciaInterna,
            /** @type { any } */    chavePrimariaInterna
        ) {

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
     * @returns { Promise <any> }        Resposta da requisicao de salvamento
     *
     * @example JX.salvar ({ DESCRICAO: 'DESCRICAO ALTERADA' }, 'MarcaProduto', { CODIGO: 999 });
     */
    static async salvar (
        /** @type { Object } */ dados,
        /** @type { String } */ instancia,
        /** @type { Object } */ chavesPrimarias
    ) {

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
     * Salva ou atualiza um registro utilizando o serviço DatasetSP.save.
     *
     * @param { Object } dados           Dados do registro a ser salvo ou atualizado.
     * @param { String } instancia       Nome da entidade (instância) onde o registro será salvo.
     * @param { Object } chavesPrimarias Chaves primárias para identificação do registro (opcional).
     *
     * @returns { Promise <any> }        Resposta da requisição de salvamento.
     *
     * @example
     * // Para atualizar um registro existente:
     * JX.novoSalvar({ SERIE: 'h' }, 'AD_SERIENOTAITEM', { ID: '1', IDSERIE: '2' });
     *
     * // Para criar um novo registro:
     * JX.novoSalvar({ ID: '2' }, 'AD_SERIENOTAITEM');
     */
    static async novoSalvar (
        /** @type { Object } */ dados,
        /** @type { String } */ instancia,
        /** @type { Object } */ chavesPrimarias
    ) {

        const url = `${ window.location.origin }/mge/service.sbr?serviceName=DatasetSP.save&outputType=json`;

        // Extrai os campos dos dados fornecidos
        const fields = Object.keys (dados).map (campo => campo.toUpperCase ());

        // Mapeia os valores para um objeto com índices numéricos em formato de string
        const valoresArray = Object.values (dados);
        const values = {};
        valoresArray.forEach ((valor, indice) => {
            values [ indice.toString () ] = String (valor);
        });

        // Monta o registro, incluindo 'pk' se houver chaves primárias
        const record = {
            values: values
        };

        if (chavesPrimarias) {
            const pk = {};
            Object.keys (chavesPrimarias).forEach (chave => {
                pk [ chave.toUpperCase () ] = String (chavesPrimarias [chave]);
            });
            record.pk = pk;
        }

        // Monta o corpo da requisição conforme o serviço DatasetSP.save
        const dadosEnvio = {
            serviceName: 'DatasetSP.save',
            requestBody: {
                entityName: instancia,
                fields: fields,
                records: [record]
            }
        };

        // Envia a requisição usando o metodo post
        return await JX.post (url, dadosEnvio);

    }



    /**
     * Deleta o registro atual na base de dados
     *
     * @param { String } instancia       Nome da Instancia a receber o registro a ser salvo
     * @param { Object } chavesPrimarias Chaves de identificacao do registro
     *
     * @returns { Promise <any> }        Resposta da requisicao de salvamento
     *
     * @example JX.deletar ('MarcaProduto', { CODIGO: 999 });
     */
    static deletar (
        /** @type { String } */ instancia,
        /** @type { Object } */ chavesPrimarias
    ) {

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
     * (METODO INTERNO) A página está rodando dentro do shell do Sankhya-W (o que
     * tem a Taskbar), e não solta numa aba?
     *
     * Acessar `window.parent.parent.document` lança quando o topo é de outra
     * origem — o que acontece com o Sankhya embarcado em portal de cliente. Sem
     * este guard, `novaGuia`/`fecharPagina` estourariam nesse cenário em vez de
     * simplesmente decidir que não estamos no shell.
     *
     * @returns { Element | null } O container da Taskbar, ou null
     */
    static _dentroDoShell () {
        try {
            return window.parent.parent.document.querySelector ('.Taskbar-container');
        } catch (e) {
            return null;
        }
    }



    /**
     * Remove o frame da página de BI
     *
     * @param { { instancia: String, paginaInicial: String, opcoes: any } } configuracoes Configuracoes gerais da pagina
     *
     * **instancia**: Nome exato do componente de BI
     *
     * **paginaInicial**: URL (a partir da pasta raiz) e nome do arquivo da pagina inicial.
     * Se omitido (com `instancia` informado), eh descoberto automaticamente a partir do
     * `entryPoint` configurado no proprio gadget de BI; se a descoberta falhar, cai no
     * padrao `app.jsp`.
     *
     * **opcoes**: [opcional] Campos com valores a serem recebidos pela pagina
     *
     * _Padrao_: `{ instancia: '', paginaInicial: 'app.jsp' }`
     *
     * Chamado SEM nenhum argumento (`JX.removerFrame ()`), nao faz a troca de iframe:
     * so esconde a barra/titulo do gadget via CSS, sem depender de saber o titulo
     * exato do componente de BI (instancia) para resolver o NUGDG. Essa solucao via
     * CSS (display: none) e provisoria, so pra cobrir o render tardio do BI enquanto
     * o fluxo normal (com instancia) nao e usado — aquele troca o iframe do gadget de
     * fato, este so esconde a barra/botao/titulo.
     *
     * A barra de titulo do DashWindow (titulo + botoes Editar/Descricao/Atualizar/
     * Detach/Maximizar) fica num wrapper sem classe propria — so a tabela interna
     * (.DashWindow-TopBar) tem classe. Por isso escondemos o parentElement dela, e
     * pra recuperar o espaco (27px) que esse wrapper reservava, achamos o wrapper
     * irmao (tambem sem classe, mas contem .DashWindow-Container) e zeramos o "top"
     * dele.
     *
     * Sobra ainda espaco em volta do DashWindow em si, vindo de tres wrappers
     * ANCESTRAIS a ele (fora do .DashWindow, na estrutura .dyna-gadget do
     * Dashboard.jsp):
     *   - dois divs logo dentro de .dyna-gadget tem nomes de classe gerados/obfuscados
     *     pelo GWT (CssResource) — mudam a cada recompilacao do GWT, entao NAO da pra
     *     confiar neles como seletor. Um dos dois reserva padding-left. A limpeza anda
     *     por estrutura, nao por classe: acha .dashboard-container-layout (classe
     *     estavel) e zera o padding de cada ancestral ate encostar em .dyna-gadget
     *     (tambem estavel).
     *   - .dashWindow-size (classe estavel, mas combinada com uma segunda classe tipo
     *     "window-1"/"window-3" que indica a posicao do gadget no layout e pode mudar
     *     por gadget/config — por isso so miramos ".dashWindow-size" sozinha) fica em
     *     99% de largura/altura por padrao; forcamos 100%.
     *   - .raiz (dentro do proprio DashWindow-Container) e o root do widget que o GWT
     *     desenha antes do iframe do BI existir, com largura/altura fixas em pixel;
     *     forcamos 100%.
     *
     * O DashWindow recria os nos do DOM quando muda de estado — fim do carregamento
     * assincrono, clique em "Atualizar", maximizar/restaurar etc. — entao uma unica
     * passada nao basta. NAO usar MutationObserver: o Dashboard.jsp (window.parent) e
     * uma pagina GWT com ag-Grid/tooltips mudando o DOM o tempo inteiro, e observar
     * subtree:true no body dele faz o callback disparar a cada mutacao alheia. Por
     * isso e polling, espacado e com teto de tentativas.
     *
     * @example JX.removerFrame ({ instancia: 'TELA_HTML5', paginaInicial: 'paginas/entidade/index.jsp'}); // BI-SankhyaJS
     * @example JX.removerFrame (); // so esconde o chrome via CSS
     */
    static removerFrame (
        /** @type { { instancia: String, paginaInicial: String, opcoes: any } } */
        { instancia, paginaInicial, ...opcoes } = { instancia: '', paginaInicial: 'app.jsp' }
    ) {

        if (arguments.length === 0) {

            const esconder = (/** @type { Document } */ documento) => {
                try {
                    documento.querySelectorAll ('.VCompactBar, .chartConfigButton').forEach (elemento => {
                        elemento.style.setProperty ('display', 'none', 'important');
                    });

                    documento.querySelectorAll ('.DashWindow-TopBar').forEach (tabela => {
                        const wrapperBarra = tabela.parentElement;
                        if (!wrapperBarra) return;
                        wrapperBarra.style.setProperty ('display', 'none', 'important');
                    });

                    documento.querySelectorAll ('.DashWindow-Container').forEach (container => {
                        const wrapperConteudo = container.parentElement;
                        if (!wrapperConteudo) return;
                        wrapperConteudo.style.setProperty ('top', '0px', 'important');

                        const tamanhoJanela = container.closest ('.dashWindow-size');
                        if (tamanhoJanela) {
                            tamanhoJanela.style.setProperty ('width', '100%', 'important');
                            tamanhoJanela.style.setProperty ('height', '100%', 'important');
                        }

                        container.querySelectorAll ('.raiz').forEach (raiz => {
                            raiz.style.setProperty ('width', '100%', 'important');
                            raiz.style.setProperty ('height', '100%', 'important');
                        });
                    });

                    documento.querySelectorAll ('.dashboard-container-layout').forEach (layout => {
                        let ancestral = layout.parentElement;
                        while (ancestral && !ancestral.classList.contains ('dyna-gadget')) {
                            ancestral.style.setProperty ('padding', '0px', 'important');
                            ancestral = ancestral.parentElement;
                        }
                    });
                } catch (erro) {
                    /* Documento cross-origin inacessivel — ignora e tenta os demais. */
                }
            };

            const documentos = [ document ];
            try {
                if (window.parent && window.parent !== window) documentos.push (window.parent.document);
            } catch (erro) { /* cross-origin */ }
            try {
                if (window.top && window.top !== window) documentos.push (window.top.document);
            } catch (erro) { /* cross-origin */ }

            /* 30 tentativas a cada 2s — cobre 1 minuto de renderizacao/redesenhos do GWT */
            /* sem depender de mutacoes alheias na pagina.                                */
            const MAX_TENTATIVAS = 30;
            let tentativas = 0;

            const intervalo = setInterval (() => {
                tentativas++;
                documentos.forEach (esconder);
                if (tentativas >= MAX_TENTATIVAS) clearInterval (intervalo);
            }, 2000);

            documentos.forEach (esconder);

            return;
        }

        /** @type { Promise <any> } */
        const promessa = new Promise (resolve => {

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
                    .textContent ?? '';
            }

            if (instancia && instancia.length > 0)  {
                JX.
                consultar (`SELECT NUGDG FROM TSIGDG WHERE TITULO = '${ String (instancia).replace (/'/g, "''") }'`).
                then (async e => {
                    // noinspection JSUnresolvedVariable
                    const nuGdt = e?.[0]?.NUGDG ?? 0;

                    /* Sem paginaInicial explicito: descobre o entryPoint direto do CONFIG */
                    /* (XML) do gadget, via consulta ao servico (sem passar pelo ag-Grid   */
                    /* do DBExplorer, que renderiza '<' como tag — aqui nao ha esse risco).*/
                    if (!paginaInicial) {
                        let entryPoint;

                        if (nuGdt) {
                            try {
                                const config = await JX.consultar (
                                    `SELECT CONFIG FROM TSIGDG WHERE NUGDG = ${ Number (nuGdt) || 0 }`
                                );
                                // noinspection JSUnresolvedVariable
                                entryPoint = config?.[0]?.CONFIG
                                    ?.match (/<html5component\b[^>]*\bentryPoint\s*=\s*"([^"]*)"/i)?.[1];
                            } catch (erro) { /* mantem o fallback abaixo */ }
                        }

                        paginaInicial = entryPoint || 'app.jsp';
                    }

                    resolve ({ gadGetID: 'html5_z6dld', nuGdt, ...opcoes });
                }).
                catch (() => resolve ({ gadGetID: 'html5_z6dld', nuGdt: 0, ...opcoes }));
            }
            else {
                resolve ({ gadGetID: 'html5_z6dld', nuGdt: 0, ...opcoes });
            }
        });

        promessa.then (o =>
            setTimeout (() => {
                if (typeof window.parent.document.getElementsByClassName ('DashWindow') [0] != 'undefined') {

                    const opcoesUrl =
                        Object.
                        keys        (o).
                        filter      (item => !['params', 'UID', 'instance', 'nuGdg', 'gadGetID'].includes (item)).
                        map         (item => `&${ item }=${ o [item] }`).
                        join        ('');

                    const url = `/mge/html5component.mge?entryPoint=${ paginaInicial }&nuGdg=${ o.nuGdt }${ opcoesUrl }`

                    setTimeout (() => {
                        const gadget = window.parent.document.getElementsByClassName ('dyna-gadget') [0];
                        if (gadget) {
                            gadget.innerHTML =
                                `<iframe src="${ url }" class="gwt-Frame" style="width: 100%; height: 100%;"></iframe>`;
                        }
                    }, 500);

                    setTimeout (() => {
                        const popup = document.getElementsByClassName ('popupContent') [0];
                        popup?.parentElement?.remove ();
                    }, 20000);

                    setTimeout (() => {
                        const corpo = document.getElementById ('stndz-style')
                            ?.parentElement?.parentElement
                            ?.getElementsByTagName ('body') [0];
                        if (corpo) corpo.style.overflow = 'hidden';
                    }, 20000);
                }
            })
        );
    }



    /**
     * Abre uma nova guia com a pagina atual
     *
     * @param { boolean } forcado - [Opcional] Indica se a abertura da nova guia deve ser forcada
     *
     * @example JX.novaGuia ();
     */
    static novaGuia (
        /** @type { boolean } */ forcado = false
    ) {

        if (forcado || JX._dentroDoShell ()) {
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
    static abrirPagina (
        /** @type { String } */ resourceID,
        /** @type { Object } */ chavesPrimarias
    ) {

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
        if (JX._dentroDoShell ()) {
            window.parent.parent.document.querySelector (
                'li.ListItem.AppItem.AppItem-selected div.Taskbar-icon.icon-close')?.click ();
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
    static getUrl (
        /** @type { String } */ path
    ) {
        return `${ window.location.origin }${ path ? '/' + String (path).replace (/^\/+/, '') : '' }`;
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
    static getCookie (
        /** @type { String } */ nome
    ) {

        const cookiesDecodificado = decodeURIComponent (document.cookie);

        if (nome && typeof nome === 'string' && nome.length) {
            const cookies = cookiesDecodificado.split (';');

            for (let cookie of cookies) {

                const separador = cookie.indexOf ('=');
                if (separador === -1) continue;

                if (cookie.slice (0, separador).trim () === nome) {
                    return cookie.slice (separador + 1);
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
     * @returns { Promise<Object> } Conteudo do arquivo
     */
    static getArquivo (
        /** @type { String } */ caminhoArquivo
    ) {
        return JX.get (caminhoArquivo, {
            headers: { 'Content-Type': 'text/plain' }
        });
    }



    /**
     * (METODO INTERNO) Retorna um array com o nome/chave e o valor dos parametros informados
     *
     * @param { any } respostaParametros Objeto a ser convertido nas tuplas dos parametros
     *
     * @returns { Array <[String, any, String]> } Tuplas dos parametros
     */
    static _converterTuplas (
        /** @type { any } */ respostaParametros
    ) {

        let tuplas = [];

        function recuperarValorNodo (/** @type { any } */ nodo) {

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
                        Number (nodo.value.substring (6, 10)),
                        Number (nodo.value.substring (3, 5)) - 1,
                        Number (nodo.value.substring (0, 2))
                    ) : null;
                    break;
                }
            }

            return valor;

        }

        function construirChavePai (
            /** @type { any } */    nodo,
            /** @type { String } */ chavePai,
            /** @type { String } */ chave
        ) {
            return chave === 'nodeName' ? chavePai + nodo [chave] + '.' : chavePai;
        }

        function iterarArray (
            /** @type { Array } */  array,
            /** @type { String } */ chavePai,
            /** @type { Array } */  tuplasInternas
        ) {
            array.forEach (elemento => iterarObjeto (elemento, chavePai, tuplasInternas));
        }

        function iterarObjeto (
            /** @type { any } */    nodo,
            /** @type { String } */ chavePai,
            /** @type { Array } */  tuplasInternas
        ) {

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
     * @param { Array <[String, any, String]> } parametrosEncontrados Tuplas dos parametros
     * @param { Array <String> } parametrosAProcurar                           Parametros a serem procurados
     * @param { boolean } isListagemTotal                                      Indica se a listagem eh de todos os parametros     *
     *
     * @returns { Object }                                                     Objeto com os parametros encontrados
     */
    static _montagemSerializacaoParametros (
        /** @type { Array <[String, any, String]> } */ parametrosEncontrados,
        /** @type { Array <String> } */                         parametrosAProcurar,
        /** @type { boolean } */                                isListagemTotal = false
    ) {

        const retornoSerializado = {};
        const arrayNormalizado = parametrosEncontrados.flat (1);

        if (isListagemTotal) {

            for (const element of arrayNormalizado) {

                const nomeParametro  = element [0];
                retornoSerializado [nomeParametro] = element [1];

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
    static async getParametro (
        /** @type { String | Array <String> } */ nomesParametros = ''
    ) {

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
            // noinspection JSUnresolvedVariable
            return resposta?.responseBody?.root ? JX._converterTuplas (resposta.responseBody.root) : [];

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
     * @returns { [String, any] } URL formatada e corpo da requisição.
     */
    static _formatarRequisicaoChamadaServico (
        /** @type { String } */  url,
        /** @type { String } */  nomeServico,
        /** @type { Object } */  dados,
        /** @type { Boolean } */ isJSON = true
    ) {

        let corpoRequisicao;

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
     * @param { any } dadosAdicionais Dados adicionais para a requisição.
     * - **aplicacao**: Aplicacao requisitante do serviço. _Padrao_: `workspace`
     * - **cabecalho**: Cabecalho da requisicao. _Padrao_: `{ 'Content-Type': 'application/json; charset=UTF-8' }`
     *
     * `statusMessage` da resposta vem sem as tags HTML (`<b>Rótulo:</b><br>` etc.) que o
     * Sankhya costuma embutir. `status` 0 ou 3 rejeita a Promise com a resposta completa;
     * 2 ou 4 apenas loga um aviso no console e resolve normalmente.
     *
     * @returns { Promise <any> }        Resposta do serviço.
     *
     * @example
     * JX.chamarServico ("mgecom@admin.getVersao", null).then (console.log);
     */
    static async chamarServico (
        /** @type { String } */ nomeServico,
        /** @type { Object } */ dados,
        /** @type { any } */    dadosAdicionais = {
            aplicacao: 'workspace',
            cabecalho: {
                'Content-Type': 'application/json; charset=UTF-8'
            }
        }
    ) {

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

        let url = JX._formatarUrlChamadaServico (nomeModulo, nomeServico, aplicacaoRequisitante);
        [ url, corpoRequisicao ] = JX._formatarRequisicaoChamadaServico (url, nomeServico, dados, isChamadaJson);

        const resposta = await JX.post (url, corpoRequisicao, {
            headers: cabecalhoFinal,
            raw: true
        });
        if (!resposta?.ok) {
            throw new Error (`[JX] Erro não identificado.`);
        }

        const dadosResposta = isChamadaJson ? await resposta.json () : await resposta.text ();

        // Normaliza statusMessage: remove prefixo "<b>Rótulo:</b><br>" gerado pelo Sankhya
        if (dadosResposta?.statusMessage) {
            dadosResposta.statusMessage = dadosResposta.statusMessage
                .replace (/<b>[^<]*<\/b>\s*<br\s*\/?>\s*/i, '')
                .replace (/<[^>]+>/g, '')
                .trim ();
        }

        const statusNum = Number (dadosResposta.status);

        if ([0, 3].includes (statusNum)) {
            throw dadosResposta;
        }

        if ([2, 4].includes (statusNum)) {
            console.warn (`[JX] ${ dadosResposta.statusMessage }`);
        }

        return dadosResposta;

    }

}
