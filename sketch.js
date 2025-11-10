// -----------------------------------------------------------
// Configurazioni globali
// -----------------------------------------------------------

// Margine esterno del canvas per evitare che i cerchi tocchino i bordi
let outerMargin = 100;

// Variabili per i dati CSV e colonne
let data;                 // tabella CSV caricata
let columnNames = [];     // array dei nomi delle colonne del CSV

// Limiti geografici
let minLat, maxLat, minLon, maxLon;

// Limiti di elevazione per calcolare la dimensione dei cerchi
let minElev = Infinity, maxElev = -Infinity;

// Oggetto per associare colori a ciascuna categoria di vulcano
let typeCategoryColors = {};


let colorPalette = [
  "#cf0808ff","#FF6347","#FF7F50","#FF8C00","#FFA500","#FFB347","#FF6A00","#FF3300","#ffbeb4ff"
];

// Opacità dei cerchi in base all'ultima eruzione
let eruptionOpacity = {
  "D1": 255, "D2": 220, "D3": 190, "D4": 140, "D5": 110,
  "D6": 80, "D7": 40, "U": 120, "Q": 100, "?": 80
};

// -----------------------------------------------------------
// Caricamento CSV
// -----------------------------------------------------------
function preload() {
  // loadTable carica un CSV con intestazioni in "data"
  data = loadTable("data.csv", "csv", "header");
}

// -----------------------------------------------------------
// Setup iniziale
// -----------------------------------------------------------
function setup() {
  // crea canvas grande quanto la finestra
  createCanvas(windowWidth, windowHeight);

  // imposta font di default
  textFont("Helvetica");

  // salva i nomi delle colonne del CSV
  columnNames = data.columns;

  // array temporanei per calcolare minimi, massimi e categorie uniche
  let latitudes = [];
  let longitudes = [];
  let typeCategories = [];

  // loop su tutte le righe del CSV
  for (let r = 0; r < data.getRowCount(); r++) {
    let lat = parseFloat(data.getString(r, "Latitude"));
    let lon = parseFloat(data.getString(r, "Longitude"));
    let elev = parseFloat(data.getString(r, "Elevation (m)"));
    let typeCat = data.getString(r, "TypeCategory");

    // aggiunge lat/lon solo se valori validi
    if (!isNaN(lat) && !isNaN(lon)) { 
      latitudes.push(lat); 
      longitudes.push(lon); 
    }

    // aggiorna min/max elevazione
    if (!isNaN(elev)) { 
      let absElev = abs(elev); 
      if (absElev < minElev) minElev = absElev; 
      if (absElev > maxElev) maxElev = absElev; 
    }

    // salva categorie uniche
    if (typeCat && !typeCategories.includes(typeCat)) { 
      typeCategories.push(typeCat); 
    }
  }

  // calcola limiti geografici
  minLat = min(latitudes); maxLat = max(latitudes);
  minLon = min(longitudes); maxLon = max(longitudes);

  // associa un colore ad ogni categoria
  for (let i = 0; i < typeCategories.length; i++) {
    typeCategoryColors[typeCategories[i]] = colorPalette[i % colorPalette.length];
  }
}

// -----------------------------------------------------------
// Ciclo draw principale
// -----------------------------------------------------------
function draw() {
  // sfondo
  background(0);

  // disegna titolo e sottotitolo
  drawTitle();

  // variabili per tooltip
  let hovered = null;
  let hoveredRow = null;

  // loop su tutti i vulcani
  for (let r = 0; r < data.getRowCount(); r++) {
    let lat = parseFloat(data.getString(r, "Latitude"));
    let lon = parseFloat(data.getString(r, "Longitude"));
    let elev = parseFloat(data.getString(r, "Elevation (m)"));
    let typeCat = data.getString(r, "TypeCategory");
    let lastEruption = data.getString(r, "Last Known Eruption");

    // salta dati mancanti
    if (isNaN(lat) || isNaN(lon) || isNaN(elev)) continue;

    // mappa coordinate geografiche su pixel
    let x = map(lon, minLon, maxLon, outerMargin + 250, width - outerMargin);
    let y = map(lat, minLat, maxLat, height - outerMargin, outerMargin + 120); 

    // dimensione del cerchio proporzionale all'elevazione
    let size = map(abs(elev), minElev, maxElev, 5, 80);

    // colore del cerchio basato sulla categoria
    let baseColor = color(typeCategoryColors[typeCat] || "#ffffff");
    let alphaValue = eruptionOpacity[lastEruption] || 150;
    baseColor.setAlpha(alphaValue);

    // disegna il cerchio
    fill(baseColor);
    noStroke();
    ellipse(x, y, size, size);

    // verifica se il mouse è sopra il cerchio
    let d = dist(mouseX, mouseY, x, y);
    if (d < size / 2) { 
      hovered = { x, y }; 
      hoveredRow = r; 
    }
  }

  // se mouse sopra un cerchio, cambia cursore e mostra tooltip
  if (hovered && hoveredRow !== null) { 
    cursor("pointer"); 
    drawTooltip(hovered.x + 15, hovered.y - 15, hoveredRow); 
  } else { 
    cursor("default"); 
  }

  // disegna legenda
  drawLegend();
}

// -----------------------------------------------------------
// Titolo
// -----------------------------------------------------------
function drawTitle() {
  push(); // salva stato grafico
  textAlign(CENTER, TOP);

  // Titolo principale
  fill("#ffffffff");
  textSize(48);
  textStyle(BOLD);
  text("Vulcani del Mondo", width / 2, 40);

  // Sottotitolo
  fill(255);
  textSize(18);
  textStyle(NORMAL);
  text("Assignment 03 - Laboratorio di Computergrafica per l'Information Design a.s. 2025/26", width / 2, 95);

  // Indicazioni per tooltip
  fill("#FFB347");
  textSize(15);
  textStyle(NORMAL);
  text("Passa con il cursore sui cerchi per scoprire i dettagli:)", width / 2, 120);

  pop(); // ripristina stato grafico
}

// -----------------------------------------------------------
// Tooltip
// -----------------------------------------------------------
function drawTooltip(px, py, rowIndex) {
  push();
  textSize(14);
  textAlign(LEFT, TOP);

  let padding = 8;
  let lineHeight = 18;
  let lines = [];

  // costruisce array di righe del tooltip
  for (let col of columnNames) {
    let val = data.getString(rowIndex, col);
    lines.push(`${col}: ${val}`);
  }

  // calcola dimensioni del box
  let tooltipWidth = 0;
  lines.forEach(line => tooltipWidth = max(tooltipWidth, textWidth(line)));
  let boxW = tooltipWidth + padding * 2;
  let boxH = lines.length * lineHeight + padding * 2;

  // disegna sfondo del tooltip
  fill(0, 180); stroke(255); strokeWeight(1.5);
  rect(px, py, boxW, boxH, 8);

  // scrive testo dentro il box
  fill(255); noStroke();
  for (let i = 0; i < lines.length; i++) { 
    text(lines[i], px + padding, py + padding + i * lineHeight); 
  }

  pop();
}

// -----------------------------------------------------------
// Legenda a sinistra
// -----------------------------------------------------------
function drawLegend() {
  push();
  textSize(14); textAlign(LEFT, TOP);

  let startX = 100;
  let startY = outerMargin + 70;
  let spacing = 25;

  // Legenda categorie
  fill(255); textStyle(BOLD);
  text("Legenda TypeCategory", startX, startY - 30);
  let i = 0;
  for (let typeCat in typeCategoryColors) {
    fill(typeCategoryColors[typeCat]); noStroke();
    ellipse(startX + 10, startY + i * spacing + 10, 15, 15);

    fill(255); textStyle(NORMAL);
    text(typeCat, startX + 30, startY + i * spacing);
    i++;
  }

  // Legenda opacità (recenza eruzione)
  let opacityStartY = startY + i * spacing + 40;
  fill(255); textStyle(BOLD);
  text("Opacità = recenza ultima eruzione", startX, opacityStartY - 25);
  textSize(12);

  let codeList = ["D1","D2","D3","D4","D5","D6","D7","U","Q","?"];
  let periodList = [
    "1964 o successivo", "1900–1963", "1800–1899", "1700–1799", 
    "1500–1699", "1–1499 d.C.", "Prima di Cristo (Olocene)", 
    "Non datata (Olocene)", "Quaternaria idrotermale", "Incerta"
  ];

  for (let j = 0; j < codeList.length; j++) {
    let code = codeList[j];
    let alphaVal = eruptionOpacity[code] || 150;
    fill(200, 200, 200, alphaVal); noStroke();
    ellipse(startX + 10, opacityStartY + j * spacing + 10, 15, 15);

    fill(255);
    text(`${code}: ${periodList[j]}`, startX + 30, opacityStartY + j * spacing);
  }

  pop();
}

// -----------------------------------------------------------
// Ridimensionamento finestra
// -----------------------------------------------------------
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
