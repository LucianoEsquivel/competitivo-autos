import { vehiculos } from './base.js';

// --- ESTADO GLOBAL ---
let estado = {
    vistaActual: 'vista-marcas', 
    monedaVista: 'AMBAS', 
    tasaCambio: 1000, 
    marcaSel: null,
    familiaSel: null,
    autoPrincipal: null,
    filtroAlternativas: 'TODOS'
};

// --- UTILIDADES DE PRECIO Y SPECS ---
function analizarPrecio(auto) {
    const precio = auto.precioOferta || auto.precioLista;
    if (!precio) return { valorOriginal: 0, monedaOriginal: 'N/A', valorUSD: 0 };
    
    const monedaOriginal = precio < 500000 ? 'USD' : 'ARS';
    const valorUSD = monedaOriginal === 'USD' ? precio : precio / estado.tasaCambio;
    
    return { valorOriginal: precio, monedaOriginal, valorUSD };
}

function formatearPrecioMostrado(precioInfo) {
    if (precioInfo.valorOriginal === 0) return "Sin Información";
    
    const valUSD = Math.round(precioInfo.valorUSD);
    const valARS = Math.round(precioInfo.valorUSD * estado.tasaCambio);
    
    const strUSD = `USD ${valUSD.toLocaleString('es-AR')}`;
    const strARS = `ARS ${valARS.toLocaleString('es-AR')}`;

    if (estado.monedaVista === 'USD') return strUSD;
    if (estado.monedaVista === 'ARS') return strARS;
    
    return `${strUSD} <br><span class="precio-ars">${strARS}</span>`;
}

function calcularDiferencia(precioAlt, precioPrinc) {
    if (precioAlt.valorOriginal === 0 || precioPrinc.valorOriginal === 0) return null;
    
    const diffUSD = precioAlt.valorUSD - precioPrinc.valorUSD;
    const isMasCaro = diffUSD > 0;
    const signo = isMasCaro ? '+' : '-';
    
    const absUSD = Math.abs(diffUSD);
    const absARS = absUSD * estado.tasaCambio;

    const strUSD = `${signo}USD ${Math.round(absUSD).toLocaleString('es-AR')}`;
    const strARS = `${signo}ARS ${Math.round(absARS).toLocaleString('es-AR')}`;

    let diffStr = "";
    if (estado.monedaVista === 'USD') {
        diffStr = strUSD;
    } else if (estado.monedaVista === 'ARS') {
        diffStr = strARS;
    } else {
        diffStr = `${strUSD}<br><span style="font-size:0.75rem; font-weight:normal; color:inherit;">${strARS}</span>`;
    }

    return { isMasCaro, diffStr };
}

function compararSpecNumerica(valAlt, valPrinc) {
    if (!valPrinc) return valAlt;

    const numAlt = parseInt(valAlt);
    const numPrinc = parseInt(valPrinc);

    if (isNaN(numAlt) || isNaN(numPrinc)) return valAlt;

    const diff = numAlt - numPrinc;
    if (diff === 0) return valAlt;

    const unidad = valAlt.replace(numAlt.toString(), '').trim();

    if (diff > 0) {
        return `${valAlt} <span class="spec-mejor">(+${diff} ${unidad})</span>`; 
    } else {
        return `${valAlt} <span class="spec-peor">(${diff} ${unidad})</span>`;  
    }
}

function formatearNombreSpec(clave) {
    const nombresLindos = {
        motor: "Motor",
        potencia: "Potencia",
        transmision: "Transmisión",
        traccion: "Tracción",
        torque: "Torque",
        capacidadCarga: "Carga/Baúl"
    };

    if (nombresLindos[clave]) return nombresLindos[clave];
    return clave.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

function generarListaSpecs(auto, principal = null) {
    let html = '<ul class="specs-list">';
    
    for (const [clave, valorOriginal] of Object.entries(auto.specs)) {
        if (!valorOriginal) continue; 

        let valorMostrado = valorOriginal;
        
        // --- SOLO COMPARAR ESTAS DOS CLAVES ---
        const clavesAComparar = ['potencia', 'capacidadCarga'];

        if (principal && principal.specs[clave] && clavesAComparar.includes(clave)) {
            valorMostrado = compararSpecNumerica(valorOriginal, principal.specs[clave]);
        }

        html += `<li><span>${formatearNombreSpec(clave)}:</span> ${valorMostrado}</li>`;
    }
    
    html += '</ul>';
    return html;
}

// --- NAVEGACIÓN Y RENDER BÁSICO ---
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    
    estado.vistaActual = viewId;

    const esInicio = viewId === 'vista-marcas';
    document.getElementById('btn-home').classList.toggle('hidden', esInicio);
    document.getElementById('btn-volver').classList.toggle('hidden', esInicio);
    document.getElementById('controles-moneda').classList.toggle('hidden', viewId !== 'vista-dashboard');
}

function renderizarBotones(contenedorId, listaItems, onClickCallback) {
    const contenedor = document.getElementById(contenedorId);
    contenedor.innerHTML = '';
    listaItems.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'menu-card';
        btn.innerText = item;
        btn.onclick = () => onClickCallback(item);
        contenedor.appendChild(btn);
    });
}

// --- FLUJO DE SELECCIÓN ---
function iniciarApp() {
    estado.tasaCambio = parseFloat(document.getElementById('input-dolar').value) || 1000;

    const marcas = [...new Set(vehiculos.map(v => v.marca))];
    switchView('vista-marcas');
    renderizarBotones('grid-marcas', marcas, (marca) => {
        estado.marcaSel = marca;
        mostrarFamilias();
    });
}

function mostrarFamilias() {
    const modelos = [...new Set(vehiculos.filter(v => v.marca === estado.marcaSel).map(v => v.modelo))];
    document.getElementById('titulo-familias').innerText = `Familias ${estado.marcaSel}`;
    switchView('vista-familias');
    renderizarBotones('grid-familias', modelos, (modelo) => {
        estado.familiaSel = modelo;
        mostrarVersiones();
    });
}

function mostrarVersiones() {
    const versiones = vehiculos.filter(v => v.marca === estado.marcaSel && v.modelo === estado.familiaSel);
    document.getElementById('titulo-versiones').innerText = `Versiones de ${estado.familiaSel}`;
    switchView('vista-versiones');
    
    const contenedor = document.getElementById('grid-versiones');
    contenedor.innerHTML = '';
    versiones.forEach(auto => {
        const btn = document.createElement('button');
        btn.className = 'menu-card';
        // --- SOLO NOMBRE DE LA VERSIÓN ---
        btn.innerHTML = `<strong>${auto.version}</strong>`; 
        btn.onclick = () => {
            estado.autoPrincipal = auto;
            abrirDashboard();
        };
        contenedor.appendChild(btn);
    });
}

// --- DASHBOARD COMERCIAL ---
function abrirDashboard() {
    switchView('vista-dashboard');
    renderizarDashboard();
}

window.setNuevoPrincipal = function(id) {
    estado.autoPrincipal = vehiculos.find(v => v.id === id);
    renderizarDashboard();
}

function renderizarDashboard() {
    const princ = estado.autoPrincipal;
    const princPrecioInfo = analizarPrecio(princ);
    
    document.getElementById('tarjeta-principal').innerHTML = `
        <div class="card-vehiculo principal">
            <div class="marca-mod">${princ.marca} ${princ.modelo}</div>
            <div class="version-mod">${princ.version}</div>
            
            <div class="vehiculo-img-container">
                <img src="img/${princ.foto}" alt="${princ.modelo}" class="vehiculo-img" onerror="this.style.display='none'">
            </div>

            <div class="precio-container">
                <div class="precio-final">${formatearPrecioMostrado(princPrecioInfo)}</div>
            </div>

            ${generarListaSpecs(princ)} 
        </div>
    `;

    let alternativas = vehiculos.filter(v => 
        v.id !== princ.id && 
        v.segmento === princ.segmento && 
        v.tipo === princ.tipo
    );

    const princUSD = princPrecioInfo.valorUSD;
    if (princUSD > 0) {
        alternativas = alternativas.filter(v => {
            const altInfo = analizarPrecio(v);
            if (altInfo.valorUSD === 0) return false;
            const ratio = altInfo.valorUSD / princUSD;
            return ratio >= 0.75 && ratio <= 1.25; 
        });
    }

    if (estado.filtroAlternativas !== 'TODOS') {
        const term = estado.filtroAlternativas;
        alternativas = alternativas.filter(v => 
            (v.specs.traccion && v.specs.traccion.includes(term)) || 
            (v.specs.transmision && v.specs.transmision.includes(term))
        );
    }

    alternativas.sort((a, b) => {
        const diffA = Math.abs(analizarPrecio(a).valorUSD - princUSD);
        const diffB = Math.abs(analizarPrecio(b).valorUSD - princUSD);
        return diffA - diffB;
    });

    const contAlt = document.getElementById('contenedor-alternativas');
    contAlt.innerHTML = '';
    
    alternativas.forEach(alt => {
        const altPrecioInfo = analizarPrecio(alt);
        const diff = calcularDiferencia(altPrecioInfo, princPrecioInfo);
        
        const card = document.createElement('div');
        card.className = 'card-vehiculo alternativa';
        card.draggable = true; 
        
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragend', handleDragEnd);

        card.innerHTML = `
            <div class="marca-mod">${alt.marca} ${alt.modelo}</div>
            <div class="version-mod">${alt.version}</div>
            
            <div class="vehiculo-img-container">
                <img src="img/${alt.foto}" alt="${alt.modelo}" class="vehiculo-img" onerror="this.style.display='none'">
            </div>
            
            <div class="precio-container">
                ${diff ? `<div class="diff-precio ${diff.isMasCaro ? 'diff-mas' : 'diff-menos'}">${diff.diffStr}</div>` : ''}
                <div class="precio-final">${formatearPrecioMostrado(altPrecioInfo)}</div>
            </div>

            ${generarListaSpecs(alt, princ)}
            <button class="btn-ir" onclick="setNuevoPrincipal('${alt.id}')">Convertir en Principal</button>
        `;
        contAlt.appendChild(card);
    });
}

// --- LÓGICA DRAG & DROP ---
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.stopPropagation();
    this.classList.remove('drag-over');
    
    if (draggedItem !== this) {
        const container = this.parentNode;
        const allItems = [...container.querySelectorAll('.card-vehiculo.alternativa')];
        const draggedIndex = allItems.indexOf(draggedItem);
        const droppedIndex = allItems.indexOf(this);
        
        if (draggedIndex < droppedIndex) {
            container.insertBefore(draggedItem, this.nextSibling);
        } else {
            container.insertBefore(draggedItem, this);
        }
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.card-vehiculo.alternativa').forEach(card => {
        card.classList.remove('drag-over');
    });
}

// --- EVENTOS DE INTERFAZ ---
document.getElementById('input-dolar').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (val > 0) {
        estado.tasaCambio = val;
        if (!document.getElementById('vista-versiones').classList.contains('hidden')) mostrarVersiones();
        if (!document.getElementById('vista-dashboard').classList.contains('hidden')) renderizarDashboard();
    }
});

document.querySelectorAll('.btn-moneda').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelectorAll('.btn-moneda').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        estado.monedaVista = e.target.dataset.moneda;
        
        if (!document.getElementById('vista-versiones').classList.contains('hidden')) mostrarVersiones();
        if (!document.getElementById('vista-dashboard').classList.contains('hidden')) renderizarDashboard();
    };
});

document.querySelectorAll('.btn-filtro').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        estado.filtroAlternativas = e.target.dataset.filtro;
        renderizarDashboard();
    };
});

document.getElementById('btn-home').onclick = iniciarApp;

document.getElementById('btn-volver').addEventListener('click', () => {
    if (estado.vistaActual === 'vista-dashboard') {
        mostrarVersiones();
    } else if (estado.vistaActual === 'vista-versiones') {
        mostrarFamilias();
    } else if (estado.vistaActual === 'vista-familias') {
        iniciarApp(); 
    }
});

iniciarApp();