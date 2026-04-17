const http = require('http');
const { readFile } = require('fs').promises;
const path = require('path');

const hostname = '127.0.0.1';
const port = 3000;

const historiqueCoupures = {
    "Agoè": [
        { jour: "Lundi", heure: 19 },
        { jour: "Jeudi", heure: 20 },
        { jour: "Lundi", heure: 19 }
    ],
    "Bè-Kpota": [
        { jour: "Mardi", heure: 21 },
        { jour: "Vendredi", heure: 19 }
    ],
    "Adidogomé": [
        { jour: "Lundi", heure: 20 },
        { jour: "Jeudi", heure: 21 }
    ],
    "Tokoin": [
        { jour: "Mercredi", heure: 18 }
    ],
    "Hédzranawoé": [
        { jour: "Samedi", heure: 19 }
    ]
};

const signalements = [];

const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.ico': 'image/x-icon'
};

function sendJson(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

function calculerRisquePourQuartier(quartier) {
    const maintenant = new Date();
    const heureActuelle = maintenant.getHours();
    const jourActuel = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"][maintenant.getDay()];
    const coupuresQuartier = historiqueCoupures[quartier] || [];

    let scoreRisque = 0;
    const raisons = [];

    if (heureActuelle >= 18 && heureActuelle <= 22) {
        scoreRisque += 30;
        raisons.push("Heure de pointe 18h-22h");
    }

    coupuresQuartier.forEach(coupure => {
        if (coupure.jour === jourActuel) {
            scoreRisque += 40;
            raisons.push(`Souvent coupé le ${jourActuel} vers ${coupure.heure}h`);
        }
        if (heureActuelle === coupure.heure - 1) {
            scoreRisque += 20;
            raisons.push(`Habituellement coupé à ${coupure.heure}h`);
        }
    });

    if (jourActuel === "Lundi" || jourActuel === "Jeudi") {
        scoreRisque += 10;
        raisons.push("Lundi/Jeudi = jours à risque");
    }

    const niveau = scoreRisque >= 70 ? 'rouge' : scoreRisque >= 40 ? 'orange' : 'vert';
    const message = niveau === 'rouge'
        ? '🔴 RISQUE ÉLEVÉ'
        : niveau === 'orange'
            ? '🟠 RISQUE MOYEN'
            : '🟢 RISQUE FAIBLE';
    const conseil = niveau === 'rouge'
        ? 'Conseil : Branche ton powerbank. Sauve ton travail. Éteins le congélo.'
        : niveau === 'orange'
            ? 'Conseil : Charge ton téléphone maintenant. Évite de lancer la machine.'
            : 'Tranquille. Profite pour charger tous tes appareils.';

    return {
        quartier,
        niveau,
        message,
        score: scoreRisque,
        conseil,
        historique: coupuresQuartier,
        raisons
    };
}

function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

async function serveStaticFile(req, res) {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    const ext = path.extname(filePath) || '.html';
    const safePath = path.join(__dirname, filePath);

    try {
        const file = await readFile(safePath);
        res.writeHead(200, {
            'Content-Type': contentTypes[ext] || 'application/octet-stream'
        });
        res.end(file);
    } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 - Fichier introuvable');
    }
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
    }

    if (pathname === '/api/risque') {
        const quartier = url.searchParams.get('quartier');
        if (!quartier) {
            return sendJson(res, { error: 'Quartier manquant' }, 400);
        }
        return sendJson(res, calculerRisquePourQuartier(quartier));
    }

    if (pathname === '/api/signalement' && req.method === 'POST') {
        try {
            const body = await parseJsonBody(req);
            const quartier = body.quartier;
            if (!quartier) {
                return sendJson(res, { error: 'Quartier manquant' }, 400);
            }
            const maintenant = new Date();
            signalements.push({ quartier, jour: ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"][maintenant.getDay()], heure: maintenant.getHours() });
            return sendJson(res, { message: `Signalement reçu pour ${quartier}` });
        } catch (error) {
            return sendJson(res, { error: 'Impossible de lire la requête' }, 400);
        }
    }

    if (pathname === '/api/signalements' && req.method === 'GET') {
        return sendJson(res, { signalements });
    }

    return serveStaticFile(req, res);
});

server.listen(port, hostname, () => {
    console.log(`Serveur lancé: http://${hostname}:${port}`);
});
