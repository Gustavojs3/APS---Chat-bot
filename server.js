//Arquivos e variáveis necessários
const express = require('express'); //Faz a tratativa de um arquivo estático - rota
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();
const server = require('http').createServer(app); //Define o protocolo http
const io = require('socket.io')(server); //Define o protocolo wss do web socket

const session = require('express-session');
const flash = require('connect-flash');

const jwt = require('jsonwebtoken'); //Token
const SECRET = 'chaveToken123@';

var today = new Date();
var hora = today.getHours() + ':' + (today.getMinutes() < 10 ? '0' : '') + today.getMinutes();

var sala = 'geral';
var tipo = 'grupo';
var chat_nivel_padrao = 1;
var chat_msg_aux = 1;
var chat_nivel = [];

const db = require('./db'); //Chama meu arquivo de conexão ao banco

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'views/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '_' + file.originalname);
    }
});
const upload = multer({ storage });

//Configurações
app.use(session({
    secret: "chaveSession123@",
    resave: true,
    saveUninitialized: true
}));
app.use(flash());

app.use(express.static(path.join(__dirname, 'views'))); //Pasta onde vai ficar os arquivos front-end
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(express.json());
app.use(express.urlencoded());

//Index
app.get('/', (req, res) => {
    res.render('index');
});
//Chat
app.get('/chat/:token', (req, res) => {
    //console.log(req.params.token);
    res.render('chat');
});
//Login
app.post('/login', async (req, res) => {
    const rs = await db.selectUsuario(req.body.login, req.body.senha);

    if (rs.length) {
        const token = jwt.sign({ usuario_id: rs[0].id }, SECRET, { expiresIn: 600 });

        db.updateUsuarioSocket(rs[0].id, token);

        return res.redirect('/chat/' + token);
    } else {
        console.log('Usuário não encontrado!');
    }

    return res.redirect('/');
});
//Cadastro
app.post('/cadastro', async (req, res) => {
    const rs = await db.selectVerificaLogin(req.body.login);

    if (!rs.length) {
        const token = jwt.sign({ usuario_id: 0 }, SECRET, { expiresIn: 600 });

        db.insertUsuario(req.body.nome, req.body.login, req.body.email, req.body.senha, token);

        return res.redirect('/chat/' + token);
    } else {
        console.log('Usuário com as mesmas credenciais!');
    }

    return res.redirect('/');
});
//Upload
app.post('/upload', upload.single("arquivo"), (req, res) => {
    var data = JSON.parse(req.body.data_usaurio);
    data['usuario_destiono'] = null;
    data['hora'] = hora;
    data['mensagem'] = '';
    data['arquivo'] = req.file.filename;

    //db.insertChat(data);

    res.send(data);
});
app.get('/download:name', function (req, res) {
    const name = req.params.name.replace(':', '');
    const file = `${__dirname}/views/uploads/${name}`;

    res.download(file);
});

//Retorna as mensagens
async function historicoMensagens(socket, filtro = {}) {
    const rs = await db.selectChat(filtro);
    socket.emit('historicoMensagens', rs);
}

function chatBot(socket) {
    let data = {
        id: 0,
        sala: sala,
        tipo: "grupo",
        usuario: "SISTEMA",
        usuario_id: 0,
        usuario_id_destino: null,
        mensagem: '',
        arquivo: null,
        ativo: 1,
        hora: null
    };

    switch (chat_nivel[0]) {
        case 1:
            data.mensagem = `
                <b>Bem-vindo!</b> <br><br>

                Selecione uma dos temas abaixo para prosseguir: <br>
                1 - Redução das Desigualdades <br>
                2 - Saúde e Bem-estar <br>
                3 - Vida na Água
            `;

            if (chat_nivel[1] !== undefined) {
                switch (chat_nivel[1]) {
                    case 1:
                        if (chat_msg_aux) {
                            chat_msg_aux = 0;
                            data.mensagem = `
                                A meta de "Redução das Desigualdades" se encontra no objetivo de número 10 dos ODS da agenda de 2030 da ONU. <br><br>

                                Objetivo 10. Reduzir a desigualdade dentro dos países e entre eles <br>

                                10.1 Até 2030, progressivamente alcançar e sustentar o crescimento da renda dos 40% da população mais pobre a uma taxa maior que a média nacional <br>

                                10.2 Até 2030, empoderar e promover a inclusão social, econômica e política de todos, independentemente da idade, gênero, deficiência, raça, etnia, origem, religião, condição econômica ou outra <br>

                                10.3 Garantir a igualdade de oportunidades e reduzir as desigualdades de resultados, inclusive por meio da eliminação de leis, políticas e práticas discriminatórias e da promoção de legislação, políticas e ações adequadas a este respeito <br>

                                10.4 Adotar políticas, especialmente fiscal, salarial e de proteção social, e alcançar progressivamente uma maior igualdade <br>

                                10.5 Melhorar a regulamentação e monitoramento dos mercados e instituições financeiras globais e fortalecer a implementação de tais regulamentações <br>

                                10.6 Assegurar uma representação e voz mais forte dos países em desenvolvimento em tomadas de decisão nas instituições econômicas e financeiras internacionais globais, a fim de produzir instituições mais eficazes, críveis, responsáveis e legítimas <br>

                                10.7 Facilitar a migração e a mobilidade ordenada, segura, regular e responsável das pessoas, inclusive por meio da implementação de políticas de migração planejadas e bem geridas <br>

                                10.a Implementar o princípio do tratamento especial e diferenciado para países em desenvolvimento, em particular os países menos desenvolvidos, em conformidade com os acordos da OMC <br>

                                10.b Incentivar a assistência oficial ao desenvolvimento e fluxos financeiros, incluindo o investimento externo direto, para os Estados onde a necessidade é maior, em particular os países menos desenvolvidos, os países africanos, os pequenos Estados insulares em desenvolvimento e os países em desenvolvimento sem litoral, de acordo com seus planos e programas nacionais <br>

                                10.c Até 2030, reduzir para menos de 3% os custos de transação de remessas dos migrantes e eliminar os corredores de remessas com custos superiores a 5% <br>
                            `;

                            socket.emit('recebeMensagem', data);
                            //db.insertChat(data);
                        }

                        data.mensagem = `
                            <a href="/download:discurso_de_odio_quais_sao_as_consequencias.mp4">Clique aqui para baixar um vídeo explicativo sobre o tema.</a> <br>
                            <a href="https://brasil.un.org/pt-br/sdgs/10" target="_blank">Clique aqui para acessar a página do tema no site da ONU.</a> <br><br>
                            
                            Ou digite 0 para voltar ao menu principal.
                        `;

                        if (chat_nivel[2] !== undefined) {
                            switch (chat_nivel[2]) {
                                case 0:
                                    chat_msg_aux = 1;
                                    data.mensagem = '';
                                    chat_nivel = [chat_nivel_padrao];
                                    chatBot(socket);
                                    break;
                    
                                default:
                                    data.mensagem = `
                                        Opção invalida, por favor selecione uma opcão válida! <br><br>

                                        <a href="/download:discurso_de_odio_quais_sao_as_consequencias.mp4">Clique aqui para baixar um vídeo explicativo sobre o tema.</a> <br>
                                        <a href="https://brasil.un.org/pt-br/sdgs/10" target="_blank">Clique aqui para acessar a página do tema no site da ONU.</a> <br><br>
                                        
                                        Ou digite 0 para voltar ao menu principal.
                                    `;
                                    chat_nivel.pop();
                                    break;
                            }
                        }
                        break;
                    
                    case 2:
                        if (chat_msg_aux) {
                            chat_msg_aux = 0;
                            data.mensagem = `
                                A meta de "Saúde e Bem-estar" se encontra no objetivo de número 3 dos ODS da agenda de 2030 da ONU. <br><br>

                                Objetivo 3. Assegurar uma vida saudável e promover o bem-estar para todas e todos, em todas as idades<br>

                                3.1 Até 2030, reduzir a taxa de mortalidade materna global para menos de 70 mortes por 100.000 nascidos vivos<br>

                                3.2 Até 2030, acabar com as mortes evitáveis de recém-nascidos e crianças menores de 5 anos, com todos os países objetivando reduzir a mortalidade neonatal para pelo menos 12 por 1.000 nascidos vivos e a mortalidade de crianças menores de 5 anos para pelo menos 25 por 1.000 nascidos vivos<br>

                                3.3 Até 2030, acabar com as epidemias de AIDS, tuberculose, malária e doenças tropicais negligenciadas, e combater a hepatite, doenças transmitidas pela água, e outras doenças transmissíveis<br>

                                3.4 Até 2030, reduzir em um terço a mortalidade prematura por doenças não transmissíveis via prevenção e tratamento, e promover a saúde mental e o bem-estar<br>

                                3.5 Reforçar a prevenção e o tratamento do abuso de substâncias, incluindo o abuso de drogas entorpecentes e uso nocivo do álcool<br>

                                3.6 Até 2020, reduzir pela metade as mortes e os ferimentos globais por acidentes em estradas<br>

                                3.7 Até 2030, assegurar o acesso universal aos serviços de saúde sexual e reprodutiva, incluindo o planejamento familiar, informação e educação, bem como a integração da saúde reprodutiva em estratégias e programas nacionais<br>

                                3.8 Atingir a cobertura universal de saúde, incluindo a proteção do risco financeiro, o acesso a serviços de saúde essenciais de qualidade e o acesso a medicamentos e vacinas essenciais seguros, eficazes, de qualidade e a preços acessíveis para todos<br>

                                3.9 Até 2030, reduzir substancialmente o número de mortes e doenças por produtos químicos perigosos, contaminação e poluição do ar e água do solo<br>

                                3.a Fortalecer a implementação da Convenção-Quadro para o Controle do Tabaco em todos os países, conforme apropriado<br>

                                3.b Apoiar a pesquisa e o desenvolvimento de vacinas e medicamentos para as doenças transmissíveis e não transmissíveis, que afetam principalmente os países em desenvolvimento, proporcionar o acesso a medicamentos e vacinas essenciais a preços acessíveis, de acordo com a Declaração de Doha, que afirma o direito dos países em desenvolvimento de utilizarem plenamente as disposições do acordo TRIPS sobre flexibilidades para proteger a saúde pública e, em particular, proporcionar o acesso a medicamentos para todos<br>

                                3.c Aumentar substancialmente o financiamento da saúde e o recrutamento, desenvolvimento e formação, e retenção do pessoal de saúde nos países em desenvolvimento, especialmente nos países menos desenvolvidos e nos pequenos Estados insulares em desenvolvimento<br>

                                3.d Reforçar a capacidade de todos os países, particularmente os países em desenvolvimento, para o alerta precoce, redução de riscos e gerenciamento de riscos nacionais e globais de saúde<br>
                            `;

                            socket.emit('recebeMensagem', data);
                            //db.insertChat(data);
                        }

                        data.mensagem = `
                            <a href="/download:como_podemos_acabar_com_a_covid_19.mp4">Clique aqui para baixar um vídeo explicativo sobre o tema.</a> <br>
                            <a href="https://brasil.un.org/pt-br/sdgs/3" target="_blank">Clique aqui para acessar a página do tema no site da ONU.</a> <br><br>
                            
                            Ou digite 0 para voltar ao menu principal.
                        `;

                        if (chat_nivel[2] !== undefined) {
                            switch (chat_nivel[2]) {
                                case 0:
                                    chat_msg_aux = 1;
                                    data.mensagem = '';
                                    chat_nivel = [chat_nivel_padrao];
                                    chatBot(socket);
                                    break;
                    
                                default:
                                    data.mensagem = `
                                        Opção invalida, por favor selecione uma opcão válida! <br><br>

                                        <a href="/download:como_podemos_acabar_com_a_covid_19.mp4">Clique aqui para baixar um vídeo explicativo sobre o tema.</a> <br>
                                        <a href="https://brasil.un.org/pt-br/sdgs/3" target="_blank">Clique aqui para acessar a página do tema no site da ONU.</a> <br><br>
                                        
                                        Ou digite 0 para voltar ao menu principal.
                                    `;
                                    chat_nivel.pop();
                                    break;
                            }
                        }
                        break;
                    
                    case 3:
                        if (chat_msg_aux) {
                            chat_msg_aux = 0;
                            data.mensagem = `
                                A meta de "Vida na Água" se encontra no objetivo de número 14 dos ODS da agenda de 2030 da ONU. <br><br>

                                Objetivo 14. Conservação e uso sustentável dos oceanos, dos mares e dos recursos marinhos para o desenvolvimento sustentável<br>

                                14.1 Até 2025, prevenir e reduzir significativamente a poluição marinha de todos os tipos, especialmente a advinda de atividades terrestres, incluindo detritos marinhos e a poluição por nutrientes<br>

                                14.2 Até 2020, gerir de forma sustentável e proteger os ecossistemas marinhos e costeiros para evitar impactos adversos significativos, inclusive por meio do reforço da sua capacidade de resiliência, e tomar medidas para a sua restauração, a fim de assegurar oceanos saudáveis e produtivos<br>

                                14.3 Minimizar e enfrentar os impactos da acidificação dos oceanos, inclusive por meio do reforço da cooperação científica em todos os níveis<br>

                                14.4 Até 2020, efetivamente regular a coleta, e acabar com a sobrepesca, ilegal, não reportada e não regulamentada e as práticas de pesca destrutivas, e implementar planos de gestão com base científica, para restaurar populações de peixes no menor tempo possível, pelo menos a níveis que possam produzir rendimento máximo sustentável, como determinado por suas características biológicas<br>

                                14.5 Até 2020, conservar pelo menos 10% das zonas costeiras e marinhas, de acordo com a legislação nacional e internacional, e com base na melhor informação científica disponível<br>

                                14.6 Até 2020, proibir certas formas de subsídios à pesca, que contribuem para a sobrecapacidade e a sobrepesca, e eliminar os subsídios que contribuam para a pesca ilegal, não reportada e não regulamentada, e abster-se de introduzir novos subsídios como estes, reconhecendo que o tratamento especial e diferenciado adequado e eficaz para os países em desenvolvimento e os países menos desenvolvidos deve ser parte integrante da negociação sobre subsídios à pesca da Organização Mundial do Comércio<br>

                                14.7 Até 2030, aumentar os benefícios econômicos para os pequenos Estados insulares em desenvolvimento e os países menos desenvolvidos, a partir do uso sustentável dos recursos marinhos, inclusive por meio de uma gestão sustentável da pesca, aquicultura e turismo<br>

                                14.a Aumentar o conhecimento científico, desenvolver capacidades de pesquisa e transferir tecnologia marinha, tendo em conta os critérios e orientações sobre a Transferência de Tecnologia Marinha da Comissão Oceanográfica Intergovernamental, a fim de melhorar a saúde dos oceanos e aumentar a contribuição da biodiversidade marinha para o desenvolvimento dos países em desenvolvimento, em particular os pequenos Estados insulares em desenvolvimento e os países menos desenvolvidos<br>

                                14.b Proporcionar o acesso dos pescadores artesanais de pequena escala aos recursos marinhos e mercados<br>

                                14.c Assegurar a conservação e o uso sustentável dos oceanos e seus recursos pela implementação do direito internacional, como refletido na UNCLOS [Convenção das Nações Unidas sobre o Direito do Mar], que provê o arcabouço legal para a conservação e utilização sustentável dos oceanos e dos seus recursos, conforme registrado no parágrafo 158 do “Futuro Que Queremos”<br>
                            `;

                            socket.emit('recebeMensagem', data);
                            //db.insertChat(data);
                        }

                        data.mensagem = `
                            <a href="/download:vida_na_agua.mp4">Clique aqui para baixar um vídeo explicativo sobre o tema.</a> <br>
                            <a href="https://brasil.un.org/pt-br/sdgs/14" target="_blank">Clique aqui para acessar a página do tema no site da ONU.</a> <br><br>
                            
                            Ou digite 0 para voltar ao menu principal.
                        `;

                        if (chat_nivel[2] !== undefined) {
                            switch (chat_nivel[2]) {
                                case 0:
                                    chat_msg_aux = 1;
                                    data.mensagem = '';
                                    chat_nivel = [chat_nivel_padrao];
                                    chatBot(socket);
                                    break;
                    
                                default:
                                    data.mensagem = `
                                        Opção invalida, por favor selecione uma opcão válida! <br><br>

                                        <a href="/download:vida_na_agua.mp4">Clique aqui para baixar um vídeo explicativo sobre o tema.</a> <br>
                                        <a href="https://brasil.un.org/pt-br/sdgs/14" target="_blank">Clique aqui para acessar a página do tema no site da ONU.</a> <br><br>
                                        
                                        Ou digite 0 para voltar ao menu principal.
                                    `;
                                    chat_nivel.pop();
                                    break;
                            }
                        }
                        break;
            
                    default:
                        data.mensagem = `
                            Opção não encontrada! <br><br>

                            Selecione uma dos temas abaixo para prosseguir: <br>
                            1 - Redução das Desigualdades <br>
                            2 - Saúde e Bem-estar <br>
                            3 - Vida na Água
                        `;
                        chat_nivel.pop();
                        break;
                }
            }
            break;

        default:
            data.mensagem = `
                Opção não encontrada!
            `;
            chat_nivel.pop();
            break;
    }

    if (data.mensagem) {
        socket.emit('recebeMensagem', data);
        //db.insertChat(data);
    }
}

//Evento que detecta uma novo cliente - novo socket
io.on('connection', socket => {
    //Coloca o usuário na sala "Geral"
    socket.join(sala);
    
    chat_msg_aux = 1;
    chat_nivel = [chat_nivel_padrao];
    chatBot(socket);

    //Valida usuário
    socket.on('validaAcesso', async data => {
        var [rs] = await db.validaUsuario(data);

        if (rs) {
            socket.emit('validaAcesso', { usuario_id: rs.id, usuario: rs.nome, sala: sala, tipo: tipo });

            //Histórico de mensagens
            historicoMensagens(socket, { tipo: tipo, sala: sala, ativo: 1 });
        } else {
            socket.emit('validaAcesso', false);
        }
    });

    //Envia mensagens
    socket.on('enviaMensagem', data => {
        if (data.sala) {
            tipo = 'grupo';

            switch (data.sala) {
                case 'geral':
                    socket.to(data.sala).emit('recebeMensagem', data);
                    chat_nivel.push(Number(data.mensagem)); //Entra no próximo nível
                    chatBot(socket);
                    //db.insertChat(data);
                    break;
                
                default:
                    socket.broadcast.emit('recebeMensagem', data);
                    //db.insertChat(data);
                    break;
            }
        }
    });
});

//Servidor 
server.listen(3000, function () {
    console.log('Servidor ON!');
});