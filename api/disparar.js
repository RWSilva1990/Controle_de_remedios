import admin from 'firebase-admin';

if (!admin.apps.length) {
  const credenciais = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  admin.initializeApp({ credential: admin.credential.cert(credenciais) });
}

const db = admin.firestore();
const messaging = admin.messaging();

function calcularEstoque(med, agora) {
  const dataInicio = new Date(med.dataCompra);
  if (dataInicio >= agora) return med.total;
  let consumido = 0;
  let dia = new Date(dataInicio);
  dia.setHours(0, 0, 0, 0);
  while (dia <= agora) {
    (med.configDoses || []).forEach(dose => {
      const [h, m] = dose.hora.split(':').map(Number);
      const momento = new Date(dia);
      momento.setHours(h, m, 0, 0);
      if (momento >= dataInicio && momento <= agora) consumido += Number(dose.qtd);
    });
    dia.setDate(dia.getDate() + 1);
  }
  return Math.max(0, med.total - consumido);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const agora = new Date();
    const horaAtual = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit', minute: '2-digit'
    }).format(agora);

    const tokenSnap = await db.collection('tokens').doc('usuario_principal').get();
    if (!tokenSnap.exists) return res.status(200).json({ status: 'Sem token.' });
    const token = tokenSnap.data().token;

    const medSnap = await db.collection('medicamentos').get();
    let enviadas = 0;
    const debugDoses = [];

    for (const docSnap of medSnap.docs) {
      const med = docSnap.data();
      for (const dose of (med.configDoses || [])) {
        debugDoses.push({ medicamento: med.nome, horaCadastrada: dose.hora, bateu: dose.hora === horaAtual });
        if (dose.hora === horaAtual) {
          const estoque = calcularEstoque(med, agora);
          await messaging.send({
            notification: {
              title: `💊 ${med.nome}`,
              body: `Tome agora ${dose.qtd} comprimido(s). Restam ${estoque}.`
            },
            data: { tag: `dose-${docSnap.id}`, url: '/' },
            token
          });
          enviadas++;

          const estoqueApos = Math.max(0, estoque - Number(dose.qtd));
          if (estoqueApos <= med.alerta) {
            await messaging.send({
              notification: {
                title: `⚠️ Estoque baixo: ${med.nome}`,
                body: `Restam apenas ${estoqueApos} comprimido(s). Compre mais!`
              },
              data: { tag: `alerta-${docSnap.id}`, url: '/' },
              token
            });
            enviadas++;
          }
        }
      }
    }

    return res.status(200).json({ sucesso: true, horaAvaliada: horaAtual, enviadas, debugDoses });
  } catch (erro) {
    return res.status(500).json({ erro: erro.message });
  }
}
