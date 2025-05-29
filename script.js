document.querySelectorAll(".section-toggle").forEach(button => {
  button.addEventListener("click", () => {
    const section = button.nextElementSibling;
    section.style.display = section.style.display === "flex" ? "none" : "flex";
  });
});

function insertHTMLAtCursor(html) {
  const editor = document.getElementById("editor");
  if (document.activeElement !== editor) {
    editor.focus();
  }

  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  range.deleteContents();

  const el = document.createElement("div");
  el.innerHTML = html;
  const frag = document.createDocumentFragment();
  let node, lastNode;

  while ((node = el.firstChild)) {
    lastNode = frag.appendChild(node);
  }

  range.insertNode(frag);

  if (lastNode) {
    range.setStartAfter(lastNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function insertSup() {
  insertHTMLAtCursor(`<sup contenteditable="true">2</sup>`);
}

function insertSub() {
  insertHTMLAtCursor(`<sub contenteditable="true">2</sub>`);
}

function insertFraction() {
  insertHTMLAtCursor(`
    <span class="fraction">
      <span class="top" contenteditable="true">a</span>
      <span class="bottom" contenteditable="true">b</span>
    </span>`);
}

function insertSymbol(sym) {
  insertHTMLAtCursor(sym);
}

function insertEMC() {
  insertHTMLAtCursor(`E = mc<sup contenteditable="true">2</sup>`);
}

document.getElementById("editor").addEventListener("input", () => {
  localStorage.setItem("editorContent", document.getElementById("editor").innerHTML);
});

window.addEventListener("load", () => {
  const saved = localStorage.getItem("editorContent");
  if (saved) {
    document.getElementById("editor").innerHTML = saved;
  }
});

function saveContent() {
  localStorage.setItem("editorContent", document.getElementById("editor").innerHTML);
  alert("Contenido guardado");
}

function resetContent() {
  if (confirm("¿Estás seguro de que querés reiniciar el documento? Se borrará todo el contenido.")) {
    document.getElementById("editor").innerHTML = "";
    localStorage.removeItem("editorContent");
  }
}

function exportHTML() {
  const content = document.getElementById("editor").innerHTML;
  const htmlContent = `
    <html>
      <head><meta charset="UTF-8"><title>Documento</title></head>
      <body>${content}</body>
    </html>`;
  const blob = new Blob([htmlContent], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "documento.html";
  link.click();
}

function exportDocx() {
  const content = document.getElementById("editor").innerHTML;
  const header = `<!DOCTYPE html>
  <html xmlns:o='urn:schemas-microsoft-com:office:office' 
        xmlns:w='urn:schemas-microsoft-com:office:word' 
        xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'><title>Documento</title></head><body>`;
  const footer = "</body></html>";
  const sourceHTML = header + content + footer;
  const blob = new Blob(['\ufeff', sourceHTML], {
    type: 'application/msword'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'documento.doc';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportPDF() {
  const originalContent = document.body.innerHTML;
  const printContent = document.getElementById("editor").innerHTML;
  document.body.innerHTML = `<div>${printContent}</div>`;
  window.print();
  document.body.innerHTML = originalContent;
  location.reload(); 
}

function openPreview() {
  const content = document.getElementById("editor").innerHTML;
  document.getElementById("previewContent").innerHTML = content;
  document.getElementById("previewModal").style.display = "block";
}

function closePreview() {
  document.getElementById("previewModal").style.display = "none";
}
