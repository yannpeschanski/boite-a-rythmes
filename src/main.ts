import { mount } from 'svelte';
import { inject } from '@vercel/analytics';
import './styles/global.css';
import App from './App.svelte';

/* ⚠️ LA MESURE D'AUDIENCE NE PART QUE DU SITE DÉPLOYÉ.
 *
 * Deux gardes, deux raisons distinctes :
 *
 * - `PROD` — en développement, la sonde appelle un point d'entrée qui n'existe
 *   pas sur `localhost` et bavarde dans la console à chaque rechargement.
 * - `MODE !== 'singlefile'` — le fichier HTML autonome s'envoie par mail et
 *   doit marcher SANS RÉSEAU. Un build qui embarque un appel à un serveur
 *   tiers casse la promesse de ce format, et ça ne se verrait qu'à l'usage.
 *
 * Sans cookie, donc rien à demander au visiteur. Côté Vercel, la collecte n'a
 * lieu que si l'onglet Analytics du projet est activé : ce code seul ne suffit
 * pas, et c'est voulu — il n'y a pas d'interrupteur caché ici. */
if (import.meta.env.PROD && import.meta.env.MODE !== 'singlefile') inject();

const app = mount(App, { target: document.getElementById('app')! });

export default app;
