/* =========================================================
   osm.js - MODUŁ OBSŁUGI DANYCH OPENSTREETMAP (OSM)
========================================================= */

const OSM_BLACKLIST = {
    amenity: [
        'parking_entrance',
        'bbq',
        'picnic_site',
        'bicycle_parking',
        'waste_transfer_station',
        'loading_dock'
    ],
    man_made: [
        'survey_point',
        'utility_pole'
    ]
};

const OSM_HIDE_RULES = {
    "access": ["private", "no", "customers", "prywatny", "zamknięty"], 
    "parking": ["private", "multi-storey", "underground"],             
    "parking_space": ["disabled"],
    "shelter_type": ["public_transport"],                             
    "amenity": ["vending_machine", "waste_disposal", "atm"],          
    "abandoned": ["yes"],                                             
    "construction": ["yes"]                                           
};

const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.nchc.org.tw/api/interpreter'
];

const OSM_DICT = {
    "amenity": "Udogodnienie",
    "tourism": "Turystyka",
    "historic": "Zabytek",
    "natural": "Natura",
    "information": "Informacja",
    "board_type": "Typ tablicy",
    "direction": "Kierunek",
    "operator": "Operator/Właściciel",
    "ref": "Numer referencyjny",
    "height": "Wysokość",
    "material": "Materiał",
    "description": "Opis",
    "map_type": "Typ mapy",
    "map_size": "Rozmiar mapy",
    "Name:de": "Nazwa w j. niemieckim",
    "Bicycle": "Rowerowa",
    "shelter_type": "Typ wiaty",
    "fee": "Opłata",
    "surface": "Nawierzchnia",
    "image": "Zdjęcie",
    "nature": "Natura",
    "hiking": "Wędrowanie",
    "picnic_site": "Miejsce piknikowe",
    "public_transport": "Transport publiczny",
    "access": "Dostępne",
    "stele": "Stela",
    "private": "Prywatny",
    "underground": "Podziemny",
    "picnic_shelter": "Wiata piknikowa",
    "citymap": "Mapa miasta",
    "history": "Historia",
    "stela": "slupek przystankowy",
    "gazebo": "altana/pawilon",
    "fireplace": "miejsce na ognisko",
    "street side": "wzdłuż ulicy",
    "ground": "nawierzchnia",
    "supervised": "nadzorowany",
    "capacity": "pojedmność",
    "Name:de:": "po niemiecku:",
    
    "shelter": "Wiata / Schronienie",
    "bench": "Ławka",
    "waste_basket": "Kosz na śmieci",
    "drinking_water": "Poidełko",
    "viewpoint": "Punkt widokowy",
    "notice": "Ogłoszenie / Tablica informacyjna",
    "board": "Tablica",
    "guidepost": "Drogowskaz",
    "map": "Mapa / Plan",
    "wood": "Drewno",
    "stone": "Kamień",
    "yes": "Tak",
    "no": "Nie",
    "public": "Publiczny",
    "forest": "Las",
    "peak": "Szczyt",
    "tree": "Drzewo",
    "monument": "Pomnik",
    "memorial": "Miejsce pamięci",
    "weather_shelter": "Wiata przeciwdeszczowa",
    "picnic_table": "Stół piknikowy",
    "topo": "Topograficzna",
    "bicycle_parking": "Parking rowerowy"
};

function isForbiddenOSM(tags) {
    if (!tags) return false;
    for (const key in tags) {
        const value = tags[key].toLowerCase();
        if (OSM_HIDE_RULES[key]) {
            if (OSM_HIDE_RULES[key].includes(value)) {
                return true; 
            }
        }
    }
    return false;
}
window.isForbiddenOSM = isForbiddenOSM;

function isBlacklistedOSM(e) {
    const t = e.tags || {};
    for (const key in OSM_BLACKLIST) {
        if (t[key] && OSM_BLACKLIST[key].includes(t[key])) {
            return true;
        }
    }
    return false;
}
window.isBlacklistedOSM = isBlacklistedOSM;

function smartTranslate(text) {
    if (!text) return "";
    const cleanText = text.toString().toLowerCase().trim();
    if (OSM_DICT[cleanText]) return OSM_DICT[cleanText];
    if (text.toString().match(/[A-Z]/)) return text;
    return cleanText
        .replace(/_/g, ' ')
        .replace(/^\w/, c => c.toUpperCase());
}
window.smartTranslate = smartTranslate;

function translateOSM(val) {
    const dict = {
        shelter: 'Wiata',
        parking: 'Parking',
        bench: 'Ławka',
        drinking_water: 'Poidełko',
        viewpoint: 'Punkt widokowy',
        information: 'Tablica informacyjna',
        picnic_site: 'Miejsce piknikowe'
    };
    return dict[val] || val;
}
window.translateOSM = translateOSM;

function formatOSMDescription(tags, id) {
    let html = `<div style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 8px;">`;
    html += `<ul style="margin:0; padding-left:0; list-style:none; line-height: 1.8;">`;

    for (const k in tags) {
        if (['name', 'source', 'id', 'created_by', 'wheelchair'].includes(k)) continue;

        const polskiKlucz = smartTranslate(k);
        const polskaWartosc = smartTranslate(tags[k]);
        const wartoscZLinkami = typeof linkify === 'function' ? linkify(polskaWartosc) : polskaWartosc;

        html += `
            <li style="display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 4px 0; align-items: flex-start;">
                <span style="color: var(--accent); font-weight: bold; width: 40%; font-size: 0.85rem; flex-shrink: 0; padding-right: 5px; box-sizing: border-box;">${polskiKlucz}:</span>
                <span style="width: 60%; font-size: 0.85rem; color: var(--text); word-break: break-all; overflow-wrap: break-word; white-space: normal;">${wartoscZLinkami}</span>
            </li>`;
    }
    
    html += `</ul></div>`;
    html += `
        <div style="margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 10px; text-align: center;">
            <a href="https://www.openstreetmap.org/node/${id}" target="_blank" class="custom-app-link">🔗 Szczegóły w OpenStreetMap</a>
        </div>`;
    
    return html;
}
window.formatOSMDescription = formatOSMDescription;

async function fetchFromAnyOverpass(query) {
    for (const server of OVERPASS_SERVERS) {
        try {
            const res = await fetch(server, {
                method: 'POST',
                body: query
            });
            if (!res.ok) throw new Error();
            return await res.json();
        } catch {
            console.warn(`Overpass mirror failed: ${server}`);
        }
    }
    throw new Error("All Overpass servers failed");
}
window.fetchFromAnyOverpass = fetchFromAnyOverpass;

async function loadOSMData(externalData = null) {
    const query = `[out:json][timeout:25];(relation["route"="hiking"](53.4,14.3,53.6,14.7);node["amenity"~"shelter|drinking_water|parking"](53.4,14.3,53.6,14.7);node["tourism"~"viewpoint|picnic_site|information"](53.4,14.3,53.6,14.7););out body;>;out skel qt;`;
    
    try {
        let data;
        if (externalData) {
            data = externalData;
        } else {
            const resp = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            if (!resp.ok) return;
            data = await resp.json();
        }

        const nodes = {}, ways = {};
        data.elements.forEach(e => { if (e.type === "node") nodes[e.id] = [e.lat, e.lon]; });
        data.elements.forEach(e => { if (e.type === "way") ways[e.id] = e.nodes.map(nid => nodes[nid]).filter(n => n); });

        // Wyczyszczenie globalnej tablicy przed załadowaniem
        window.processedTrails = [];
        globalTrails = []; 

        data.elements.filter(e => e.type === "relation").forEach(rel => {
            // Bezpieczne pobranie koloru z OSM
            const sym = (rel.tags.osmc_symbol || "").toLowerCase();
            const tagColor = (rel.tags.color || "").toLowerCase();
            let color = '#15803d'; // Bezpieczny domyślny kolor szlaku (zielony)
            
            // Logika wyznaczania koloru linii szlaku na podstawie tagów i symbolu osmc
            if (tagColor) {
                if (tagColor.startsWith('#')) color = tagColor;
                else if (['red', 'blue', 'green', 'yellow', 'black'].includes(tagColor)) {
                    if (tagColor === 'red') color = '#ef4444';
                    else if (tagColor === 'blue') color = '#3b82f6';
                    else if (tagColor === 'green') color = '#22c55e';
                    else if (tagColor === 'yellow') color = '#eab308';
                    else if (tagColor === 'black') color = '#0f172a';
                }
            } else if (sym) {
                if (sym.includes('red')) color = '#ef4444'; 
                else if (sym.includes('blue')) color = '#3b82f6'; 
                else if (sym.includes('green')) color = '#22c55e'; 
                else if (sym.includes('yellow')) color = '#eab308'; 
                else if (sym.includes('black')) color = '#0f172a';
            }

            const trailName = rel.tags.name || "Nienazwany szlak turystyczny";
            const trailCoords = [];
            const trailPolylines = [];

            // Iteracja po elementach członkowskich relacji (scalamy drogi w jedną listę współrzędnych)
            rel.members.forEach(m => { 
                if (m.type === "way" && ways[m.ref] && typeof hikingLayer !== 'undefined') {
                    const wayPoints = ways[m.ref];
                    wayPoints.forEach(coord => {
                        trailCoords.push(coord); // Zachowanie do obliczeń dystansu i profilu
                    });

                    // Tworzenie pojedynczych obiektów polilinii Leafleta odpowiadających kolorowi z OSM
                    const pl = L.polyline(wayPoints, {
                        color: color, 
                        weight: 4, 
                        opacity: 0.7, 
                        dashArray: '8, 8'
                    })
                    .bindTooltip(`${trailName}`)
                    .addTo(hikingLayer);

                    trailPolylines.push(pl);
                } 
            });

            // Rejestracja szlaku w nowej, zaawansowanej strukturze danych
            if (trailCoords.length > 0) {
                const trailObject = {
                    id: rel.id ? String(rel.id) : `trail_${Math.random()}`,
                    name: trailName,
                    coords: trailCoords,
                    polylines: trailPolylines,
                    color: color,
                    tags: rel.tags || {}
                };

                window.processedTrails.push(trailObject);
                
                // Zachowanie wstecznej kompatybilności dla starszych modułów (np. navigation.js)
                const wayLatLngs = trailCoords.map(c => L.latLng(c[0], c[1]));
                globalTrails.push({ name: trailName, coords: wayLatLngs });
            }
        });

        // Wywołanie asynchronicznego przeliczenia bazy szlaków po załadowaniu danych
        if (typeof initTrailsDatabase === 'function') {
            initTrailsDatabase();
        }

        data.elements.filter(e => e.type === "node" && e.tags).forEach(e => {
            if (isBlacklistedOSM(e)) return;
            if (isForbiddenOSM(e.tags)) return; 
            
            let icon = '📍';
            if (e.tags.amenity === 'shelter') icon = '🏠';
            else if (e.tags.tourism === 'viewpoint') icon = '🔭';
            else if (e.tags.amenity === 'parking') icon = '🅿️';
            else if (e.tags.tourism === 'information') icon = 'ℹ️';
            else if (e.tags.amenity === 'drinking_water' || e.tags.tourism === 'drinking_water') icon = '💧';
            
            const osmName = e.tags.name || translateOSM(e.tags.amenity || e.tags.tourism || 'Point');
            globalOsmPois.push({ latlng: L.latLng(e.lat, e.lon), name: osmName });

            if (typeof poiLayer !== 'undefined') {
                const marker = L.marker([e.lat, e.lon], {
                    icon: L.divIcon({
                        html: `<div style="font-size:18px">${icon}</div>`,
                        className: 'poi-icon'
                    })
                }).addTo(poiLayer);

                marker.on('click', () => {
                    const osmData = {
                        name: osmName,
                        icon: icon,
                        category: "Baza OpenStreetMap",
                        description: formatOSMDescription(e.tags, e.id),
                        photos: [] 
                    };
                    if (typeof openCustomPoiModal === 'function') {
                        openCustomPoiModal(osmData);
                    }
                });
            }
        });

    } catch (err) {
        console.error("Błąd ładowania OSM:", err);
    }
}
window.loadOSMData = loadOSMData;

async function initOSM() {
    const CACHE_KEY = 'osm_puszcza_wkrzanska_v1';
    const query = `[out:json][timeout:25];
    (
        relation["route"="hiking"](53.4,14.3,53.6,14.7);
        node["amenity"~"shelter|drinking_water|parking"](53.4,14.3,53.6,14.7);
        node["tourism"~"viewpoint|picnic_site|information"](53.4,14.3,53.6,14.7);
    );
    out body;
    >;
    out skel qt;`;

    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            loadOSMData(JSON.parse(cached));
            return;
        }

        const data = await fetchFromAnyOverpass(query);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        loadOSMData(data);

    } catch (e) {
        console.error('OSM init failed', e);
    }
}
window.initOSM = initOSM;

// Bezpieczna opóźniona inicjalizacja chroniąca przed ReferenceError mapy w app.js
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initOSM();
    }, 150); 
});
