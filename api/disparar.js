const admin = require('firebase-admin');

if (!admin.apps.length) {
    const credenciais = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    admin.initializeApp({ credential: admin.credential.cert(credenciais) });
}

const db = admin.firestore();
const messaging = admin.messaging();

module.exports = async function handler(req, res) {
    // Permite chamada manual pelo app (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const agora = new Date();
        const horaAtual = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit'
        }).format(agora);

        console.log(`[disparar] Verificando: ${horaAtual}`);

        // Busca token do dispositivo
        const tokenSnap = await db.collection('tokens').doc('usuario_principal').get();
        if (!tokenSnap.exists) {
            return res.status(200).json({ status: 'Sem token cadastrado.' });
        }
        const tokenCelular = tokenSnap.data().token;

        // Busca todos os medicamentos
        const medSnap = await db.collection('medicamentos').get();
        let enviadas = 0;
        const erros = [];

        for (const doc of medSnap.docs) {
            const med = doc.data();
            const doses = med.configDoses || [];

            // ── Verifica dose da hora atual ──
            for (const dose of doses) {
                if (dose.hora === horaAtual) {
                    // Calcula estoque atual
                    const estoque = calcularEstoque(med, agora);

                    try {
                        await messaging.send({
                            notification: {
                                title: `💊 ${med.nome}`,
                                body: `Tome agora ${dose.qtd} comprimido(s). Restam ${estoque}.`
                            },
                            data: { tag: `dose-${doc.id}`, url: '/' },
                            token: tokenCelular
                        });
                        enviadas++;

                        // ── Verifica estoque mínimo após esta dose ──
                        const estoqueAposDose = Math.max(0, estoque - Number(dose.qtd));
                        if (estoqueAposDose <= med.alerta) {
                            await messaging.send({
                                notification: {
                                    title: `⚠️ Estoque baixo: ${med.nome}`,
                                    body: `Restam apenas ${estoqueAposDose} comprimido(s). Hora de comprar mais!`
                                },
                                data: { tag: `alerta-${doc.id}`, url: '/' },
                                token: tokenCelular
                            });
                            enviadas++;
                        }
                    } catch(e) {
                        erros.push(`${med.nome}: ${e.message}`);
                    }
                }
            }
        }

        return res.status(200).json({
            sucesso: true,
            horaAvaliada: horaAtual,
            enviadas,
            erros: erros.length ? erros : undefined
        });

    } catch (erro) {
        console.error('[disparar] Erro:', erro);
        return res.status(500).json({ erro: erro.message });
    }
};

// Replica a lógica de cálculo de estoque (igual ao frontend)
function calcularEstoque(med, agora) {
    const dataInicio = new Date(med.dataCompra);
    if (dataInicio >= agora) return med.total;

    let consumido = 0;
    let dia = new Date(dataInicio);
    dia.setHours(0, 0, 0, 0);
    const hojeMax = new Date(agora);

    while (dia <= hojeMax) {
        (med.configDoses || []).forEach(dose => {
            const [h, m] = dose.hora.split(':').map(Number);
            const momento = new Date(dia);
            momento.setHours(h, m, 0, 0);
            if (momento >= dataInicio && momento <= agora) {
                consumido += Number(dose.qtd);
            }
        });
        dia.setDate(dia.getDate() + 1);
    }
    return Math.max(0, med.total - consumido);
}
