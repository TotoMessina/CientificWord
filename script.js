// Utils
const getEditor = () => document.getElementById("editor");
let isReadOnly = false;
// Inserciones rápidas
const insertSup = () => insertHTMLAtCursor(`<sup contenteditable="true">x</sup>`);
const insertSub = () => insertHTMLAtCursor(`<sub contenteditable="true">x</sub>`);
const insertFraction = () => insertHTMLAtCursor(`
  <span class="fraction" contenteditable="false">
    <span class="top" contenteditable="true">a</span>
    <span class="bottom" contenteditable="true">b</span>
  </span>
`);
const insertSymbol = sym => insertHTMLAtCursor(sym);
const insertEMC = () => insertHTMLAtCursor(`E = mc<sup contenteditable="true">2</sup>`);
// Historial y deshacer
let undoStack = [];
let redoStack = [];
let isTyping = false;
let historyStack = JSON.parse(localStorage.getItem("historial")) || [];
let lastSavedIndex = historyStack.length - 1;

// Secciones plegables con animación
document.querySelectorAll(".section-toggle").forEach(button => {
  button.addEventListener("click", () => {
    const content = button.nextElementSibling;
    content.classList.toggle("open");
  });
});
// Evita que al hacer clic en cualquier botón de toolbar o controles se pierda el foco
document.querySelectorAll('#toolbar button, #controls button').forEach(btn => {
  btn.addEventListener('mousedown', e => {
    e.preventDefault();
    // De esta forma, el botón nunca roba el foco del editor.
    // Luego, el event 'click' seguirá ejecutándose normalmente.
  });
});

let editSeconds = 0;

// Títulos numerados
let sectionNumbers = [0, 0, 0];
let references = JSON.parse(localStorage.getItem("references")) || [];

// Inserción HTML
function insertHTMLAtCursor(html) {
  const editor = getEditor();
  // Si por alguna razón no está enfocado, lo enfocamos
  if (document.activeElement !== editor) {
    editor.focus();
  }

  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();

  // Creamos un contenedor temporal y vamos transfiriendo los nodos
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const frag = document.createDocumentFragment();
  let node, lastNode;
  while ((node = temp.firstChild)) {
    lastNode = frag.appendChild(node);
  }

  // Insertamos el fragmento justo donde estaba la selección
  range.insertNode(frag);

  // Movemos el cursor justo después del último nodo insertado
  if (lastNode) {
    const newRange = document.createRange();
    newRange.setStartAfter(lastNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  updateCounter(); // Si quieres que el contador se actualice en cada inserción
}

// Contador
function updateCounter() {
  const text = getEditor().innerText || "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  document.getElementById("wordCount").textContent = words.length;
  document.getElementById("charCount").textContent = text.length;
  document.getElementById("charCountNoSpaces").textContent = text.replace(/\s/g, '').length;
}

// Imagen
function insertImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.src = e.target.result;
    Object.assign(img.style, {
      maxWidth: "100%", display: "block", margin: "10px 0"
    });
    insertNodeAtCursor(img);
    updateCounter();
  };
  reader.readAsDataURL(file);
}

function insertNodeAtCursor(node) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  sel.removeAllRanges();
  sel.addRange(range);
}

// Guardado & restauración
function saveContent() {
  localStorage.setItem("editorContent", getEditor().innerHTML);
  alert("Contenido guardado");
}

function resetContent() {
  if (confirm("¿Reiniciar el documento?")) {
    getEditor().innerHTML = "";
    localStorage.removeItem("editorContent");
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
}

// Exportadores
function exportHTML() {
  const content = getEditor().innerHTML;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${content}</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "documento.html";
  link.click();
}

function exportDocx() {
  const content = getEditor().innerHTML;
  const header = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' 
    xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Documento</title></head><body>`;
  const blob = new Blob(['\ufeff', header + content + "</body></html>"], { type: "application/msword" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "documento.doc";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportPDF() {
  const original = document.body.innerHTML;
  document.body.innerHTML = `<div>${getEditor().innerHTML}</div>`;
  window.print();
  document.body.innerHTML = original;
  location.reload();
}

// Vista previa
function openPreview() {
  document.getElementById("previewContent").innerHTML = getEditor().innerHTML;
  document.getElementById("previewModal").style.display = "block";
}

function showPreview(content) {
  const overlay = document.getElementById("previewOverlay");
  document.getElementById("previewContent").innerHTML = content;
  overlay.style.display = "flex";
}

function closePreview() {
  document.getElementById("previewOverlay").style.display = "none";
  document.getElementById("previewContent").innerHTML = "";
}

// Página
function updatePageStyle() {
  const size = document.getElementById("pageSize").value;
  const orientation = document.getElementById("orientation").value;
  const margin = parseFloat(document.getElementById("marginInput").value || 2);

  document.body.classList.toggle("letter", size === "letter");
  document.body.classList.toggle("landscape", orientation === "landscape");
  getEditor().style.padding = `${margin}cm`;
}

function insertHeading(level) {
  sectionNumbers[level - 1]++;
  for (let i = level; i < sectionNumbers.length; i++) sectionNumbers[i] = 0;
  const num = sectionNumbers.slice(0, level).join(".").replace(/(\.0)+$/, "");

  const heading = document.createElement(`h${level}`);
  heading.textContent = `${num} Título ${level}`;
  heading.contentEditable = "true";
  heading.style.margin = "10px 0";
  insertNodeAtCursor(heading);
}

function saveState() {
  if (!isTyping) return;
  undoStack.push(getEditor().innerHTML);
  redoStack = [];
  isTyping = false;
  updateHistoryView();
}

function undo() {
  if (undoStack.length <= lastSavedIndex + 1) {
    alert("No puedes deshacer más allá del último guardado.");
    return;
  }
  redoStack.push(getEditor().innerHTML);
  getEditor().innerHTML = undoStack.pop();
  placeCaretAtEnd(getEditor());
  updateCounter();
  updateHistoryView();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(getEditor().innerHTML);
  getEditor().innerHTML = redoStack.pop();
  placeCaretAtEnd(getEditor());
  updateCounter();
  updateHistoryView();
}

function placeCaretAtEnd(el) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// Guardar documento completo
function saveDocument() {
  const header = document.getElementById("header").innerHTML;
  const content = getEditor().innerHTML;
  const footer = document.getElementById("footer").innerHTML;
  const full = JSON.stringify({ header, content, footer });

  localStorage.setItem("documento", full);
  historyStack.push(full);
  lastSavedIndex = historyStack.length - 1;
  localStorage.setItem("historial", JSON.stringify(historyStack));
  alert("Documento guardado");
  updateHistoryView();
}

function updateHistoryView() {
  const list = document.getElementById("historyList");
  list.innerHTML = "";
  historyStack.forEach((state, index) => {
    const li = document.createElement("li");
    li.textContent = `Versión ${index + 1}${index === lastSavedIndex ? " (guardado)" : ""}`;
    if (index === lastSavedIndex) li.classList.add("saved");

    li.onclick = () => {
      if (confirm("¿Deseás volver a esta versión?")) {
        getEditor().innerHTML = state;
        updateCounter();
        placeCaretAtEnd(getEditor());
      }
    };
    li.onmouseenter = () => showPreview(state);
    li.onmouseleave = () => closePreview();
    list.appendChild(li);
  });
}

function clearHistory() {
  if (confirm("¿Borrar historial?")) {
    historyStack = [];
    lastSavedIndex = -1;
    localStorage.removeItem("historial");
    updateHistoryView();
  }
}

function toggleHistory() {
  const panel = document.getElementById("historyPanel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

// Referencias
// Manejo de referencias
function addReference() {
  const input = document.getElementById("newReference");
  const value = input.value.trim();
  if (!value) return;

  references.push(value);
  localStorage.setItem("references", JSON.stringify(references));
  input.value = "";
  updateReferenceList();
  updateReferenceDisplay();
}

function updateReferenceList() {
  const ul = document.getElementById("referenceList");
  ul.innerHTML = "";
  references.forEach((ref, index) => {
    const li = document.createElement("li");
    li.textContent = ref;

    const citeBtn = document.createElement("button");
    citeBtn.textContent = "Citar";
    citeBtn.style.marginLeft = "10px";
    citeBtn.onclick = () => insertCitation(index + 1);

    li.appendChild(citeBtn);
    ul.appendChild(li);
  });
}

function insertCitation(num) {
  insertHTMLAtCursor(`<sup>[${num}]</sup>`);
}

function updateReferenceDisplay() {
  const ol = document.getElementById("referenceDisplay");
  ol.innerHTML = "";
  references.forEach(ref => {
    const li = document.createElement("li");
    li.textContent = ref;
    ol.appendChild(li);
  });
}

function showAutoSaveMessage() {
  let msg = document.getElementById("autoSaveMsg");
  if (!msg) {
    msg = document.createElement("div");
    msg.id = "autoSaveMsg";
    msg.style.position = "fixed";
    msg.style.bottom = "10px";
    msg.style.right = "10px";
    msg.style.background = "#2ecc71";
    msg.style.color = "#fff";
    msg.style.padding = "10px 20px";
    msg.style.borderRadius = "5px";
    msg.style.boxShadow = "0 0 5px rgba(0,0,0,0.3)";
    msg.style.zIndex = "10000";
    msg.style.fontSize = "14px";
    msg.style.transition = "opacity 0.3s";
    msg.style.opacity = "0";
    document.body.appendChild(msg);
  }

  msg.textContent = "💾 Guardado automáticamente";
  msg.style.opacity = "1";

  setTimeout(() => {
    msg.style.opacity = "0";
  }, 2500);
}

function toggleReadOnly() {
  isReadOnly = !isReadOnly;
  getEditor().contentEditable = !isReadOnly;
  document.getElementById("header").contentEditable = !isReadOnly;
  document.getElementById("footer").contentEditable = !isReadOnly;

  alert(isReadOnly ? "Modo solo lectura activado." : "Modo edición activado.");
}

function insertEquation() {
  insertHTMLAtCursor(`
    <div class="equation" contenteditable="true">E = mc²</div>
  `);
}

function insertTable(rows = 2, cols = 2) {
  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.margin = "10px 0";
  table.style.width = "100%";

  for (let i = 0; i < rows; i++) {
    const tr = document.createElement("tr");
    for (let j = 0; j < cols; j++) {
      const td = document.createElement("td");
      td.contentEditable = "true";
      td.style.border = "1px solid #333";
      td.style.padding = "5px";
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  insertNodeAtCursor(table);
}

function searchInDocument() {
  const term = document.getElementById("searchInput").value.toLowerCase();
  const editor = getEditor();
  const text = editor.innerText.toLowerCase();

  if (!term) {
    editor.innerHTML = editor.innerHTML.replace(/<mark>(.*?)<\/mark>/g, '$1');
    return;
  }

  // Restaurar sin marcas
  editor.innerHTML = editor.innerHTML.replace(/<mark>(.*?)<\/mark>/g, '$1');

  // Marcar nuevas ocurrencias
  const regex = new RegExp(`(${term})`, "gi");
  editor.innerHTML = editor.innerHTML.replace(regex, "<mark>$1</mark>");
}

setInterval(() => {
  editSeconds++;
  const minutes = Math.floor(editSeconds / 60);
  document.getElementById("editMinutes").textContent = minutes;
}, 60000); // cada minuto

// Guardado automático cada 30s si hubo cambios
setInterval(() => {
  if (isTyping) {
    saveContent();
    showAutoSaveMessage();
    isTyping = false;
  }
}, 30000);

getEditor().addEventListener("input", () => {
  isTyping = true;
  clearTimeout(window._typeTimer);
  window._typeTimer = setTimeout(saveState, 400);
});

document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key === "z") {
    e.preventDefault(); undo();
  }
  if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
    e.preventDefault(); redo();
  }
  if (e.ctrlKey && e.key === "b") {
    e.preventDefault();
    document.execCommand("bold");
  }

  if (e.ctrlKey && e.key === "i") {
    e.preventDefault();
    document.execCommand("italic");
  }

  if (e.ctrlKey && e.key === "u") {
    e.preventDefault();
    document.execCommand("underline");
  }

  if (e.ctrlKey && e.altKey && e.key === "m") {
    e.preventDefault();
    insertEMC();
  }
});

document.addEventListener("mouseup", e => {
  const selection = window.getSelection();
  const text = selection.toString();
  const menu = document.getElementById("textMenu");

  if (text.length > 0 && getEditor().contains(selection.anchorNode)) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    menu.style.top = `${window.scrollY + rect.top - 40}px`;
    menu.style.left = `${window.scrollX + rect.left}px`;
    menu.style.display = "block";
  } else {
    menu.style.display = "none";
  }
});

window.addEventListener("load", () => {
  updateReferenceList();
  updateReferenceDisplay();
  getEditor().focus();
});

window.addEventListener("load", () => {
  const saved = localStorage.getItem("editorContent");
  if (saved) getEditor().innerHTML = saved;
  updateCounter();

  // Dark mode
  const darkPref = localStorage.getItem("darkMode");
  if (darkPref === "true") document.body.classList.add("dark");
});