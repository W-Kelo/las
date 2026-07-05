/* =========================================================
   navigation.js - SYSTEM NARRACYJNEGO OPISU TRASY I NAWIGACJI
========================================================= */

// Zmienne globalne modułu nawigacji
let routeStepsGeom = [];
let stepHighlightLayer = null;

// Szablony fraz dla generatora narracyjnego (baza opisów)
const phrases = {
    straight: [
        "Idź przed siebie przez", "Trzymaj się wyznaczonej drogi przez", "Kontynuuj marsz prosto przez",
        "Podążaj pewnie tą ścieżką przez", "Nie zbaczaj z kursu na dystansie", "Czeka cię odcinek na wprost o długości",
        "Masz przed sobą prostą drogę przez", "Spacerkiem na wprost przez kolejne", "Kieruj się cały czas prosto przez",
        "Twoja droga prowadzi stąd prosto przez", "Zrelaksuj się, idziesz prosto przez", "Utrzymaj kierunek przez"
    ],
    softRight: [
        "Skręć łagodnie w prawo i kontynuuj przez", "Ścieżka lekko odbija w prawo, podążaj nią przez",
        "Delikatnie w prawo, czeka cię odcinek", "Kieruj się lekko na prawo na dystansie", "Zaraz ścieżka odchyli się w prawo, trzymaj się jej przez", 
        "Skieruj kroki delikatnie w prawo. Idź tą ścieżką"
    ],
    right: [
        "Na skrzyżowaniu skręć w prawo i idź przez", "Skręć w prawo i kontynuuj przez", "Wybierz drogę w prawo, czeka cię",
        "Odbij zdecydowanie w prawo i maszeruj przez", "Tu musisz skręcić w prawo, idź przez", "Twoja trasa wiedzie w prawo przez",
        "Kieruj się w prawą odnogę przez kolejne", "Zakręt w prawo. Kontynuuj przez", "Po skręcie w prawo masz do przejścia",
        "W prawo! Trzymaj kurs przez", "Zmiana kierunku: skręć w prawo i pokonaj"
    ],
    sharpRight: [
        "Skręć ostro w prawo (prawie zawracając) i idź przez", "Wykonaj ostry skręt w prawo, następnie",
        "Nawrót w prawo! Czeka cię odcinek", "Bardzo ostro w prawo, kieruj się tak przez", "Zwróć uwagę - ostry zakręt w prawo! Następnie",
        "Ścieżka gwałtownie skręca w prawo. Idź nia przez", "Ostro na prawo, po czym maszeruj przez", "Uważaj, ostry skręt w prawo, a potem",
        "Skieruj się niemal za siebie w prawo przez", "Wykonaj mocny zwrot w prawo i kontynuuj przez"
    ],
    softLeft: [
        "Skręć łagodnie w lewo i kontynuuj przez", "Trzymaj się lewej strony i idź przez", "Ścieżka lekko odbija w lewo, podążaj nią przez",
        "Delikatnie w lewo, czeka cię odcinek", "Wybierz lewą stronę ścieżki i maszeruj przez", "Kieruj się lekko na lewo na dystansie",
        "Zaraz ścieżka odchyli się w lewo, trzymaj się jej przez", "Skieruj kroki delikatnie w lewo przez"
    ],
    left: [
        "Na skrzyżowaniu skręć w lewo i idź przez", "Skręć w lewo i kontynuuj przez", "Wybierz drogę w lewo, czeka cię",
        "Odbij zdecydowanie w lewo i maszeruj przez", "Tu musisz skręcić w lewo, idź przez", "Twoja trasa wiedzie w lewo przez",
        "Kieruj się w lewą odnogę przez kolejne", "Zakręt w lewo. Kontynuuj przez", "Po skręcie w lewo masz do przejścia",
        "W lewo! Trzymaj kurs przez", "Zmiana kierunku: skręć w lewo i pokonaj"
    ],
    sharpLeft: [
        "Skręć ostro w lewo (prawie zawracając) i idź przez", "Wykonaj ostry skręt w lewo, następnie",
        "Nawrót w lewo! Czeka cię odcinek", "Bardzo ostro w lewo, kieruj się tak przez", "Zwróć uwagę - ostry zakręt w lewo! Następnie",
        "Ścieżka gwałtownie skręca w lewo. Idź nią przez", "Ostro na lewo, po czym maszeruj przez", "Uważaj, ostry skręt w lewo, a potem",
        "Skieruj się niemal za siebie w lewo przez", "Wykonaj mocny zwrot w lewo i kontynuuj przez"
    ],
    poiPrefix: [
        "Będziesz przechodzić obok", "Mijasz po drodze", "Zwróć uwagę na", "W pobliżu znajduje się",
        "Na tym odcinku powita cię", "Przejdziesz tuż obok", "Niedaleko znajdziesz", "Trasa wiedzie obok",
        "Na twojej drodze pojawi się", "Zaraz miniesz obiekt:", "Twoją uwagę zwróci", "Twoim punktem odniesienia będzie"
    ],
    trailPrefix: [
        "Twój przewodnik to", "Idziesz teraz wzdłuż", "Twoja trasa pokrywa się z", "Znalazłeś się na szlaku:",
        "Prowadzić cię będzie", "Kieruj się za znakami szlaku:", "Teraz podążasz traktem:", "Ścieżka to oficjalnie",
        "Zgodnie z oznaczeniami to", "Maszerujesz aktualnie odcinkiem:"
    ]
};

function getRandom(arr) { 
    return arr[Math.floor(Math.random() * arr.length)]; 
}

function getBearing(lat1, lon1, lat2, lon2) {
    const toRad = x => x * Math.PI / 180;
    const toDeg = x => x * 180 / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    let brng = toDeg(Math.atan2(y, x));
    return (brng + 360) % 360;
}
window.getBearing = getBearing;

function getCompassDirection(brng) {
    if (brng >= 337.5 || brng < 22.5) return "na północ";
    if (brng >= 22.5 && brng < 67.5) return "na płn-wschód";
    if (brng >= 67.5 && brng < 112.5) return "na wschód";
    if (brng >= 112.5 && brng < 157.5) return "na płd-wschód";
    if (brng >= 157.5 && brng < 202.5) return "na południe";
    if (brng >= 202.5 && brng < 247.5) return "na płd-zachód";
    if (brng >= 247.5 && brng < 292.5) return "na zachód";
    if (brng >= 292.5 && brng < 337.5) return "na płn-zachód";
    return "";
}
window.getCompassDirection = getCompassDirection;

function getNearbyFeatures(latlng, radius = 45) {
    let foundPois = [];
    let foundTrail = null;
    const checkPoint = L.latLng(latlng);
    
    if (typeof pois !== 'undefined') {
        pois.forEach(p => { 
            if (checkPoint.distanceTo(p.latlng) <= radius) foundPois.push(`${p.name || 'Wybrany punkt'}`); 
        });
    }
    
    if (typeof globalCustomPois !== 'undefined') {
        globalCustomPois.forEach(p => { 
            if (checkPoint.distanceTo(p.latlng) <= 31) { 
                foundPois.push(`${p.icon} ${p.name}`); 
            } 
        });
    }

    if (typeof globalOsmPois !== 'undefined') {
        globalOsmPois.forEach(p => { 
            if (checkPoint.distanceTo(p.latlng) <= radius) foundPois.push(`📌 ${p.name}`); 
        });
    }
    
    if (typeof globalTrails !== 'undefined') {
        for (let t of globalTrails) {
            for (let c of t.coords) {
                if (c.distanceTo(checkPoint) < 20) { 
                    foundTrail = t.name; 
                    break; 
                }
            }
            if (foundTrail) break;
        }
    }

    return { pois: [...new Set(foundPois)], trail: foundTrail };
}
window.getNearbyFeatures = getNearbyFeatures;

function moveVirtualDot(latlng, bearing, distMeters) {
    const R = 6378137; 
    const lat1 = latlng[0] * Math.PI / 180;
    const lon1 = latlng[1] * Math.PI / 180;
    const brng = bearing * Math.PI / 180;
    const dR = distMeters / R;

    const lat2 = Math.asin(Math.sin(lat1)*Math.cos(dR) + Math.cos(lat1)*Math.sin(dR)*Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(dR)*Math.cos(lat1), Math.cos(dR)-Math.sin(lat1)*Math.sin(lat2));

    return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
}
window.moveVirtualDot = moveVirtualDot;

function getTurnAngle(p1, p2, p3) {
    const a = L.latLng(p1).distanceTo(L.latLng(p2));
    const b = L.latLng(p2).distanceTo(L.latLng(p3));
    const c = L.latLng(p1).distanceTo(L.latLng(p3));

    if (a === 0 || b === 0) return 0;

    let cosC = (a*a + b*b - c*c) / (2 * a * b);
    cosC = Math.max(-1, Math.min(1, cosC)); 
    const turnMagnitude = 180 - (Math.acos(cosC) * (180 / Math.PI));
    const headingIn = getBearing(p1[0], p1[1], p2[0], p2[1]);

    const leftScout = moveVirtualDot(p2, (headingIn - 90 + 360) % 360, 20);
    const rightScout = moveVirtualDot(p2, (headingIn + 90) % 360, 20);
    const distFromLeftScout = L.latLng(leftScout).distanceTo(L.latLng(p3));
    const distFromRightScout = L.latLng(rightScout).distanceTo(L.latLng(p3));

    if (distFromRightScout < distFromLeftScout) {
        return turnMagnitude;  
    } else {
        return -turnMagnitude; 
    }
}
window.getTurnAngle = getTurnAngle;

function calculateTotalSimplifiedDist() {
    let d = 0;
    if (!routeStepsGeom || routeStepsGeom.length === 0) return 1; 
    for (let i = 0; i < routeStepsGeom.length - 1; i++) {
        if (routeStepsGeom[i][0] && routeStepsGeom[i+1][0]) {
            d += L.latLng(routeStepsGeom[i][0]).distanceTo(L.latLng(routeStepsGeom[i+1][0]));
        }
    }
    return d > 0 ? d : 1;
}
window.calculateTotalSimplifiedDist = calculateTotalSimplifiedDist;

function calculateTotalDistToPoint(pointIndex) {
    let d = 0;
    if (!routeGeometry || routeGeometry.length < 2) return 0;
    const maxIndex = Math.min(pointIndex, routeGeometry.length - 1);
    for (let j = 1; j <= maxIndex; j++) {
        d += L.latLng(routeGeometry[j-1]).distanceTo(L.latLng(routeGeometry[j]));
    }
    return d;
}
window.calculateTotalDistToPoint = calculateTotalDistToPoint;

function generateRouteDescription() {
    const container = document.getElementById('routeDescText');
    if (!container) return;
    
    if (routeGeometry.length < 2) {
        container.innerHTML = "<em>Zaznacz punkty na mapie, by wygenerować przewodnik.</em>";
        return;
    }

    routeStepsGeom = [];
    if (stepHighlightLayer) { 
        map.removeLayer(stepHighlightLayer); 
        stepHighlightLayer = null; 
    }

    const projectedPoints = routeGeometry.map(p => L.CRS.EPSG3857.project(L.latLng(p[0], p[1])));
    const simplifiedProj = L.LineUtil.simplify(projectedPoints, 45); 
    const pointsToUse = simplifiedProj.length > 2 ? simplifiedProj : projectedPoints;
    
    const keyPoints = pointsToUse.map(p => {
        const ll = L.CRS.EPSG3857.unproject(p);
        return [ll.lat, ll.lng];
    });

    let text = `<div style="margin-bottom:15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
        <strong>🟢 Punkt Startowy</strong><br>
        <small>Wysokość: ${routePoints[0].elevation.toFixed(0)} m n.p.m.</small>
    </div>`;
    
    let stepNumber = 1;
    const sortedStops = typeof routeStops !== 'undefined' ? [...routeStops].sort((a,b) => a.snappedDist - b.snappedDist) : [];
    let nextStopIdx = 0;
    
    let accumulatedGeom = [keyPoints[0]]; 
    let accumulatedDist = 0;

    for (let i = 0; i < keyPoints.length - 1; i++) {
        const currP = keyPoints[i];
        const nextP = keyPoints[i+1];
        const dist = L.latLng(currP).distanceTo(L.latLng(nextP));
        
        let turnAngle = 0;
        if (i > 0) {
            const prevP = keyPoints[i-1];
            turnAngle = getTurnAngle(prevP, currP, nextP);
        }

        const totalRawDist = typeof calculateTotalDist === 'function' ? calculateTotalDist() : 1;
        const rawDistAtThisPoint = (accumulatedDist / calculateTotalSimplifiedDist()) * totalRawDist;

        while (nextStopIdx < sortedStops.length && sortedStops[nextStopIdx].snappedDist <= (rawDistAtThisPoint + 150)) { 
            const stop = sortedStops[nextStopIdx];
            
            let timeTxtInfo = `${stop.duration} min.`;
            if (typeof isTimeSkipped !== 'undefined' && !isTimeSkipped && stop.startTime && stop.endTime) {
                const hs = stop.startTime.getHours().toString().padStart(2,'0');
                const ms = stop.startTime.getMinutes().toString().padStart(2,'0');
                const he = stop.endTime.getHours().toString().padStart(2,'0');
                const me = stop.endTime.getMinutes().toString().padStart(2,'0');
                timeTxtInfo = `<b>${hs}:${ms} - ${he}:${me}</b> (${stop.duration} min)`;
            }

            text += `
                <div class="route-step" style="border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.1);">
                    <div style="display:flex; align-items:center;">
                        <span class="route-step-icon" style="font-size:1.5rem;">${stop.icon === 'dot' ? '☕' : stop.icon}</span> 
                        <div>
                            <small style="color:#f59e0b; font-weight:bold; display:block; text-transform: uppercase;">POSTÓJ: ${stop.name}</small>
                            Czas postoju: ${timeTxtInfo}
                        </div>
                    </div>
                    ${stop.desc ? `<span class="route-step-poi" style="border-top-color:rgba(245,158,11,0.3); color: inherit;">📝 ${stop.desc}</span>` : ''}
                </div>`;
            nextStopIdx++;
        }
        accumulatedGeom.push(nextP);
        accumulatedDist += dist;

        const isLastSegment = (i === keyPoints.length - 2);

        if (i === 0 || isLastSegment || Math.abs(turnAngle) >= 20 || accumulatedDist > 500) {
            let instruction = "";
            let icon = "🧭";

            if (i === 0) {
                let startDirection = getCompassDirection(getBearing(currP[0], currP[1], nextP[0], nextP[1]));
                if (isLastSegment) {
                    instruction = `<strong>Ostatnia prosta!</strong> Ruszaj na <strong>${startDirection}</strong>. Za`;
                    icon = "🏁";
                } else {
                    instruction = `Ruszaj na <strong>${startDirection}</strong> i idź prosto przez`;
                }
            } 
            else if (!isLastSegment) {
                if (Math.abs(turnAngle) < 20) { instruction = getRandom(phrases.straight); icon = "⬆️"; }
                else if (turnAngle >= 20 && turnAngle <= 60) { instruction = getRandom(phrases.softRight); icon = "↗️"; }
                else if (turnAngle > 60 && turnAngle <= 130) { instruction = getRandom(phrases.right); icon = "➡️"; }
                else if (turnAngle > 130) { instruction = getRandom(phrases.sharpRight); icon = "⤵️"; }
                else if (turnAngle <= -20 && turnAngle >= -60) { instruction = getRandom(phrases.softLeft); icon = "↖️"; }
                else if (turnAngle < -60 && turnAngle >= -130) { instruction = getRandom(phrases.left); icon = "⬅️"; }
                else if (turnAngle < -130) { instruction = getRandom(phrases.sharpLeft); icon = "⤴️"; }
            }
            else if (isLastSegment && i !== 0) {
                let basicTurn = "Idź prosto";
                if (turnAngle >= 20 && turnAngle <= 60) basicTurn = "Skręć lekko w prawo";
                else if (turnAngle > 60 && turnAngle <= 130) basicTurn = "Skręć w prawo";
                else if (turnAngle > 130) basicTurn = "Ostro w prawo";
                else if (turnAngle <= -20 && turnAngle >= -60) basicTurn = "Skręć lekko w lewo";
                else if (turnAngle < -60 && turnAngle >= -130) basicTurn = "Skręć w lewo";
                else if (turnAngle < -130) basicTurn = "Ostro w lewo";

                instruction = `<strong>Ostatnia prosta!</strong> ${basicTurn}, za`;
                icon = "🏁";
            }

            const timeMins = accumulatedDist / 75; 
            let timeTxt = timeMins < 1 ? "< 1 min" : `~${Math.round(timeMins)} min`;
            
            let features = getNearbyFeatures(nextP);
            let extraInfo = "";
            if (features.trail) extraInfo += `<span class="route-step-poi">🥾 ${getRandom(phrases.trailPrefix)} <b>${features.trail}</b>.</span>`;
            if (features.pois.length > 0) extraInfo += `<span class="route-step-poi">📍 ${getRandom(phrases.poiPrefix)}: <b>${features.pois.join(', ')}</b>.</span>`;

            const stepIdx = routeStepsGeom.length;
            routeStepsGeom.push([...accumulatedGeom]);

            let borderStyle = isLastSegment ? 'border-left-color: #ef4444;' : '';
            
            // Zmiana zdarzeń myszy na uniwersalne zdarzenia wskaźnika pointer (obsługa smartfonów)
            text += `
                <div class="route-step" onpointerenter="highlightStep(${stepIdx})" onpointerleave="unhighlightStep()" style="cursor:pointer; ${borderStyle}">
                    <div style="display:flex; align-items:center;">
                        <span class="route-step-icon" style="font-size:1.5rem;">${icon}</span> 
                        <div>
                            <small style="color:var(--accent); font-weight:bold; display:block; text-transform: uppercase; letter-spacing: 1px; font-size: 0.7rem; margin-bottom: 2px;">Etap ${stepNumber}</small>
                            ${instruction} <span class="route-step-dist">${accumulatedDist.toFixed(0)} m</span>.
                            <small style="opacity:0.7; margin-left: 5px; white-space: nowrap;">(⏱️ ${timeTxt})</small>
                        </div>
                    </div>
                    ${extraInfo}
                </div>`;

            accumulatedGeom = [nextP];
            accumulatedDist = 0;
            stepNumber++;
        }
    }

    text += `
        <div style="margin-top:15px; font-weight:bold; border-top: 1px solid rgba(255,255,255,0.1); padding-top:10px;">
            📍 Meta wycieczki <small>(${routePoints[routePoints.length-1].elevation.toFixed(0)} m n.p.m.)</small>
        </div>
    `;

    container.innerHTML = text;
}
window.generateRouteDescription = generateRouteDescription;

function highlightStep(idx) {
    if (!routeStepsGeom[idx] || !map) return;
    if (stepHighlightLayer) map.removeLayer(stepHighlightLayer);
    
    stepHighlightLayer = L.polyline(routeStepsGeom[idx], {
        color: '#3b82f6', weight: 12, opacity: 0.6, lineCap: 'round', zIndexOffset: 2000
    }).addTo(map);
}
window.highlightStep = highlightStep;

function unhighlightStep() {
    if (stepHighlightLayer && map) {
        map.removeLayer(stepHighlightLayer);
        stepHighlightLayer = null;
    }
}
window.unhighlightStep = unhighlightStep;
function openDescModal() {
    generateRouteDescription(); // Wymusza przeliczenie na najświeższych danych!
    openCenteredModal('descModal');
}
