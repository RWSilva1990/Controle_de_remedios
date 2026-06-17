const admin = require('firebase-admin');

// 1. Inicia o Firebase usando a Chave que guardamos no Vercel
if (!admin.apps.length) {
    const credenciais = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    admin.initializeApp({
        credential: admin.credential.cert(credenciais)
    });
}

const db = admin.firestore();
const messaging = admin.messaging();

module.exports = async function handler(req, res) {
    try {
        // 2. Pega a hora exata no Brasil (Formato: "HH:MM")
        const horaAtual = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date());

        console.log(`Rodando verificação para: ${horaAtual}`);

        // 3. Pega o Token do seu celular cadastrado no banco
        const tokenSnap = await db.collection('tokens').doc('usuario_principal').get();
        if (!tokenSnap.exists) return res.status(200).json({ status: "Sem tokens cadastrados." });
        const tokenCelular = tokenSnap.data().token;

        // 4. Busca todos os medicamentos
        const medSnap = await db.collection('medicamentos').get();
        let avisosEnviados = 0;

        // 5. Verifica se algum deles tem dose exatamente nesta hora/minuto
        for (const doc of medSnap.docs) {
            const med = doc.data();
            const doses = med.configDoses || [];

            for (const dose of doses) {
                if (dose.hora === horaAtual) {
                    // Prepara a Notificação Push
                    const mensagem = {
                        notification: {
                            title: `💊 Hora do Remédio: ${med.nome}`,
                            body: `Tome agora ${dose.qtd} comprimido(s).`
                        },
                        token: tokenCelular
                    };

                    // Envia pro celular
                    await messaging.send(mensagem);
                    avisosEnviados++;
                }
            }
        }

        // Responde que deu tudo certo
        res.status(200).json({ sucesso: true, horaAvaliada: horaAtual, enviadas: avisosEnviados });

    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: erro.message });
    }
}
