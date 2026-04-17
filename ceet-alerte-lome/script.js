const API_BASE = 'http://127.0.0.1:3000/api';

async function calculerRisque() {
    const quartier = document.getElementById('quartier').value;
    const resultat = document.getElementById('resultat');
    const conseil = document.getElementById('conseil');
    const historiqueDiv = document.getElementById('historique');

    if (!quartier) {
        alert('Choisis un quartier frère');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/risque?quartier=${encodeURIComponent(quartier)}`);
        if (!response.ok) {
            throw new Error('Impossible de récupérer les données serveur');
        }
        const data = await response.json();

        resultat.innerText = data.message;
        resultat.className = `badge ${data.niveau}`;
        conseil.innerText = data.conseil;
        historiqueDiv.innerText = `Dernières coupures connues : ${data.historique.map(c => `${c.jour} ${c.heure}h`).join(', ')}`;
    } catch (error) {
        resultat.innerText = 'Erreur de connexion au serveur';
        resultat.className = 'badge orange';
        conseil.innerText = 'Vérifie que le serveur tourne sur http://127.0.0.1:3000';
        historiqueDiv.innerText = '';
        console.error(error);
    }
}

async function signalerCoupure() {
    const quartier = document.getElementById('quartier').value;
    if (!quartier) {
        alert("Choisis ton quartier d'abord");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/signalement`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quartier })
        });

        if (!response.ok) {
            throw new Error('Erreur serveur lors du signalement');
        }

        const result = await response.json();
        alert(result.message);
    } catch (error) {
        alert('Impossible de signaler la coupure : connexion serveur introuvable');
        console.error(error);
    }
}