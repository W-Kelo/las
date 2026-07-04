/* =========================================================
   routePoints.js - MODUŁ EDYCJI I ZARZĄDZANIA PUNKTAMI TRASY
========================================================= */

// Globalne zmienne punktów trasy (Dostępne dla pozostałych plików)
let routePoints = []; 
let draggedPointIndex = null;

function openPointsModal() {
    openCenteredModal('pointsModal');
    renderPointsList();
}
window.openPointsModal = openPointsModal;

function renderPointsList() {
    const list = document.getElementById('pointsList');
    if (!list) return;
    list.innerHTML = routePoints.length === 0 ? "<p style='text-align:center; opacity:0.7;'>Brak punktów na trasie.</p>" : "";
    
    routePoints.forEach((p, i) => {
        const item = document.createElement('div');
        item.className = 'point-item';
        
        item.draggable = true;
        item.dataset.index = i;
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);

        item.onmouseenter = () => highlightPointOnMap(i);
        item.onmouseleave = () => unhighlightPointOnMap(i);

        const distText = i === 0 ? "START" : `+${(p.distFromPrev).toFixed(0)} m`;
        let timeTxt = "";
        if (i > 0) {
            const timeMins = p.distFromPrev / 75;
            timeTxt = timeMins < 1 ? "(< 1 min)" : `(~${Math.round(timeMins)} min)`;
        }

        item.innerHTML = `
            <div class="point-info">
                <strong>Punkt ${i + 1}</strong> <small>(${p.elevation ? p.elevation.toFixed(0) : '?'} m n.p.m.)</small><br>
                <span style="color: var(--accent); font-weight: bold;">${distText}</span> <small style="opacity:0.7;">${timeTxt}</small>
            </div>
            <div class="point-actions">
                <button class="secondary" title="Na sam początek" onclick="movePointToExtremity(${i}, true)" ${i===0?'disabled':''}>⇈</button>
                <button class="secondary" title="W górę" onclick="movePoint(${i}, 'up')" ${i===0?'disabled':''}>↑</button>
                <button class="secondary" title="W dół" onclick="movePoint(${i}, 'down')" ${i===routePoints.length-1?'disabled':''}>↓</button>
                <button class="secondary" title="Na sam koniec" onclick="movePointToExtremity(${i}, false)" ${i===routePoints.length-1?'disabled':''}>⇊</button>
                <button class="danger" title="Usuń punkt" onclick="removePointById(${p.id})">🗑️</button>
            </div>`;
        list.appendChild(item);
    });
}
window.renderPointsList = renderPointsList;

function handleDragStart(e) {
    draggedPointIndex = parseInt(this.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.index); 
    this.style.opacity = '0.4';
}

function handleDragOver(e) {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.stopPropagation();
    this.classList.remove('drag-over');

    const targetIndex = parseInt(this.dataset.index);

    if (draggedPointIndex !== null && draggedPointIndex !== targetIndex) {
        const movedItem = routePoints.splice(draggedPointIndex, 1)[0];
        routePoints.splice(targetIndex, 0, movedItem);

        if (typeof recalculateRoute === 'function') {
            recalculateRoute();
        }
    }
    return false;
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    document.querySelectorAll('.point-item').forEach(item => item.classList.remove('drag-over'));
}

function highlightPointOnMap(idx) {
    const pt = routePoints[idx];
    if (!pt) return;
    
    pt.marker.setStyle({
        radius: 14,
        fillColor: '#f59e0b',
        color: '#fff',
        weight: 4
    });
    pt.marker.bringToFront();
}
window.highlightPointOnMap = highlightPointOnMap;

function unhighlightPointOnMap(idx) {
    const pt = routePoints[idx];
    if (!pt) return;
    
    const dotColor = routePrefPointsEnabled ? routePrefPointsColor : '#22c55e';
    pt.marker.setStyle({
        radius: 8,
        fillColor: dotColor,
        color: '#fff',
        weight: 3
    });
}
window.unhighlightPointOnMap = unhighlightPointOnMap;

function movePoint(idx, direction) {
    if (typeof isRouting !== 'undefined' && isRouting) return;
    if (direction === 'up' && idx > 0) { 
        [routePoints[idx], routePoints[idx-1]] = [routePoints[idx-1], routePoints[idx]]; 
    } else if (direction === 'down' && idx < routePoints.length - 1) { 
        [routePoints[idx], routePoints[idx+1]] = [routePoints[idx+1], routePoints[idx]]; 
    }
    
    if (typeof recalculateRoute === 'function') {
        recalculateRoute();
    }
    renderPointsList();
}
window.movePoint = movePoint;

function movePointToExtremity(idx, toTop) {
    if (typeof isRouting !== 'undefined' && isRouting) return;
    
    const pt = routePoints.splice(idx, 1)[0];
    
    if (toTop) {
        routePoints.unshift(pt);
    } else {
        routePoints.push(pt);
    }
    
    if (typeof recalculateRoute === 'function') {
        recalculateRoute();
    }
    renderPointsList();
}
window.movePointToExtremity = movePointToExtremity;

function removePointById(id) {
    if (typeof isRouting !== 'undefined' && isRouting) return;
    const idx = routePoints.findIndex(p => p.id === id);
    if (idx > -1) {
        if (map && routePoints[idx].marker) {
            map.removeLayer(routePoints[idx].marker);
        }
        routePoints.splice(idx, 1);
        
        if (typeof recalculateRoute === 'function') {
            recalculateRoute();
        }
        renderPointsList();
    }
}
window.removePointById = removePointById;

function reverseRoute() {
    if ((typeof isRouting !== 'undefined' && isRouting) || routePoints.length < 2) return;
    
    routePoints.reverse();
    
    if (typeof recalculateRoute === 'function') {
        recalculateRoute();
    }
    renderPointsList();
}
window.reverseRoute = reverseRoute;
