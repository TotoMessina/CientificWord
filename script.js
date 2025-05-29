// Utils
const getEditor = () => document.getElementById("editor");

// Secciones plegables
document.querySelectorAll(".section-toggle").forEach(button => {
  button.addEventListener("click", () => {
    const section = button.nextElementSibling;
    section.style.display = section.style.display === "flex" ? "none" : "flex";
  });
});

// Inserción HTML
function insertHTMLAtCursor(html) {
  const editor = getEditor();
  if (document.activeElement !== editor) editor.focus();

  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();

  const el = document.createElement("div");
  el.innerHTML = html;
  const frag = document.createDocumentFragment();
  let node;
  while ((node = el.firstChild)) frag.appendChild(node);

  range.insertNode(frag);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

// Inserciones rápidas
const insertSup = () => insertHTMLAtCursor(`<sup contenteditable="true">2</sup>`);
const insertSub = () => insertHTMLAtCursor(`<sub contenteditable="true">2</sub>`);
const insertFraction = () => insertHTMLAtCursor(`
  <span class="fraction">
    <span class="top" contenteditable="true">a</span>
    <span class="bottom" contenteditable="true">b</span>
  </span>`);
const insertSymbol = sym => insertHTMLAtCursor(sym);
const insertEMC = () => insertHTMLAtCursor(`E = mc<sup contenteditable="true">2</sup>`);

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

window.addEventListener("load", () => {
  const saved = localStorage.getItem("editorContent");
  if (saved) getEditor().innerHTML = saved;
  updateCounter();

  // Dark mode
  const darkPref = localStorage.getItem("darkMode");
  if (darkPref === "true") document.body.classList.add("dark");
});

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

// Títulos numerados
let sectionNumbers = [0, 0, 0];

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

// Historial y deshacer
let undoStack = [];
let redoStack = [];
let isTyping = false;
let historyStack = JSON.parse(localStorage.getItem("historial")) || [];
let lastSavedIndex = historyStack.length - 1;

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

// Eventos globales
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
});

// Referencias
// Manejo de referencias

let references = JSON.parse(localStorage.getItem("references")) || [];

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

window.addEventListener("load", () => {
  updateReferenceList();
  updateReferenceDisplay();
});
