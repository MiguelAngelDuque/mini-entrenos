const STORAGE_KEY = "madc_mini_entrenos_v1";

const $ = (sel) => document.querySelector(sel);

const els = {
  year: $("#year"),
  stats: $("#stats"),
  list: $("#list"),
  empty: $("#empty"),
  error: $("#error"),

  form: $("#form"),
  id: $("#id"),
  title: $("#title"),
  kind: $("#kind"),
  date: $("#date"),
  minutes: $("#minutes"),
  notes: $("#notes"),
  submitBtn: $("#submitBtn"),
  cancelBtn: $("#cancelBtn"),

  q: $("#q"),
  filterKind: $("#filterKind"),
  filterDone: $("#filterDone"),
  sort: $("#sort"),

  clearBtn: $("#clearBtn"),
  exportBtn: $("#exportBtn"),

  seedBtn: $("#seedBtn"),
  importFile: $("#importFile"),
};

els.year.textContent = new Date().getFullYear();

function uid() {
  // Id simple y suficiente para este proyecto
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

let items = loadItems();

function normalizeText(s) {
  return (s ?? "").toString().trim();
}

function validate(payload) {
  const title = normalizeText(payload.title);
  if (!title) return "El título es obligatorio.";
  if (title.length > 60) return "El título no puede superar 60 caracteres.";
  const notes = normalizeText(payload.notes);
  if (notes.length > 200) return "Las notas no pueden superar 200 caracteres.";
  const minutes = payload.minutes === "" ? "" : Number(payload.minutes);
  if (payload.minutes !== "" && (!Number.isFinite(minutes) || minutes < 0 || minutes > 600)) {
    return "Minutos debe ser un número entre 0 y 600.";
  }
  return "";
}

function upsertItem(payload) {
  const now = new Date().toISOString();

  if (payload.id) {
    items = items.map((it) => it.id === payload.id ? { ...it, ...payload } : it);
  } else {
    items = [
      {
        id: uid(),
        title: payload.title,
        kind: payload.kind,
        date: payload.date || "",
        minutes: payload.minutes === "" ? "" : Number(payload.minutes),
        notes: payload.notes || "",
        done: false,
        createdAt: now,
      },
      ...items,
    ];
  }

  saveItems(items);
  render();
}

function deleteItem(id) {
  items = items.filter((it) => it.id !== id);
  saveItems(items);
  render();
}

function toggleDone(id) {
  items = items.map((it) => it.id === id ? { ...it, done: !it.done } : it);
  saveItems(items);
  render();
}

function setEditing(item) {
  els.id.value = item.id;
  els.title.value = item.title;
  els.kind.value = item.kind;
  els.date.value = item.date || "";
  els.minutes.value = item.minutes === "" ? "" : String(item.minutes);
  els.notes.value = item.notes || "";
  els.submitBtn.textContent = "Guardar cambios";
  els.cancelBtn.hidden = false;
  els.title.focus();
}

function clearEditing() {
  els.id.value = "";
  els.form.reset();
  els.submitBtn.textContent = "Añadir";
  els.cancelBtn.hidden = true;
  els.error.textContent = "";
}

function matchesFilters(item) {
  const q = normalizeText(els.q.value).toLowerCase();
  const kind = els.filterKind.value;
  const done = els.filterDone.value;

  const text = `${item.title} ${item.notes}`.toLowerCase();
  if (q && !text.includes(q)) return false;

  if (kind !== "all" && item.kind !== kind) return false;

  if (done === "pending" && item.done) return false;
  if (done === "done" && !item.done) return false;

  return true;
}

function sortItems(arr) {
  const mode = els.sort.value;

  const byCreated = (a, b) => (a.createdAt || "").localeCompare(b.createdAt || "");
  const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");

  const copy = [...arr];

  switch (mode) {
    case "createdAsc": return copy.sort(byCreated);
    case "createdDesc": return copy.sort((a, b) => byCreated(b, a));
    case "dateAsc": return copy.sort(byDate);
    case "dateDesc": return copy.sort((a, b) => byDate(b, a));
    default: return copy;
  }
}

function renderStats(filtered) {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const pending = total - done;
  const shown = filtered.length;
  const totalMinutes = items.reduce((acc, i) => acc + (Number.isFinite(i.minutes) ? i.minutes : 0), 0);
  const shownMinutes = filtered.reduce((acc, i) => acc + (Number.isFinite(i.minutes) ? i.minutes : 0), 0);


  els.stats.innerHTML = "";
  const pills = [
    `Total: ${total}`,
    `Pendientes: ${pending}`,
    `Completados: ${done}`,
    `Mostrando: ${shown}`,
    `Minutos total: ${totalMinutes}`,
    `Minutos (mostrando): ${shownMinutes}`,

  ];

  for (const p of pills) {
    const el = document.createElement("span");
    el.className = "pill";
    el.textContent = p;
    els.stats.appendChild(el);
  }
}

function render() {
  const filtered = sortItems(items.filter(matchesFilters));

  renderStats(filtered);

  els.list.innerHTML = "";
  els.empty.hidden = filtered.length !== 0;

  for (const it of filtered) {
    const wrap = document.createElement("div");
    wrap.className = `item ${it.done ? "done" : ""}`;
    wrap.dataset.id = it.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!it.done;
    checkbox.setAttribute("aria-label", "Marcar como completado");
    checkbox.className = "toggle";

    const center = document.createElement("div");
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = it.title;

    const meta = document.createElement("div");
    meta.className = "meta";
    const parts = [
      it.kind === "entreno" ? "Entreno" : "Tarea",
      it.date ? `📅 ${it.date}` : "",
      it.minutes !== "" ? `⏱️ ${it.minutes} min` : "",
      it.notes ? `📝 ${it.notes}` : "",
    ].filter(Boolean);
    meta.textContent = parts.join(" · ");

    center.appendChild(title);
    center.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "small";
    editBtn.type = "button";
    editBtn.dataset.action = "edit";
    editBtn.textContent = "Editar";

    const delBtn = document.createElement("button");
    delBtn.className = "small";
    delBtn.type = "button";
    delBtn.dataset.action = "delete";
    delBtn.textContent = "Borrar";

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    wrap.appendChild(checkbox);
    wrap.appendChild(center);
    wrap.appendChild(actions);

    els.list.appendChild(wrap);
  }
}

els.form.addEventListener("submit", (e) => {
  e.preventDefault();

  const payload = {
    id: els.id.value || "",
    title: normalizeText(els.title.value),
    kind: els.kind.value,
    date: els.date.value,
    minutes: els.minutes.value,
    notes: normalizeText(els.notes.value),
  };

  const err = validate(payload);
  if (err) {
    els.error.textContent = err;
    return;
  }

  els.error.textContent = "";
  upsertItem(payload);
  clearEditing();
});

els.cancelBtn.addEventListener("click", () => clearEditing());

els.list.addEventListener("click", (e) => {
  const itemEl = e.target.closest(".item");
  if (!itemEl) return;

  const id = itemEl.dataset.id;

  if (e.target.classList.contains("toggle")) return;

  const action = e.target.dataset.action;
  if (!action) return;

  const item = items.find((x) => x.id === id);
  if (!item) return;

  if (action === "edit") setEditing(item);
  if (action === "delete") deleteItem(id);
});

els.list.addEventListener("change", (e) => {
  if (!e.target.classList.contains("toggle")) return;
  const itemEl = e.target.closest(".item");
  if (!itemEl) return;
  toggleDone(itemEl.dataset.id);
});

["input", "change"].forEach((evt) => {
  els.q.addEventListener(evt, render);
  els.filterKind.addEventListener(evt, render);
  els.filterDone.addEventListener(evt, render);
  els.sort.addEventListener(evt, render);
});

els.clearBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const ok = confirm("¿Seguro que quieres borrar todo? Esto no se puede deshacer.");
  if (!ok) return;
  items = [];
  saveItems(items);
  clearEditing();
  render();
});

els.exportBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tareas-entrenos.json";
  a.click();
  URL.revokeObjectURL(url);
});

function seedDemo() {
  const ok = confirm("¿Cargar datos de ejemplo? Se añadirán a tu lista actual.");
  if (!ok) return;

  const now = new Date().toISOString();
  const demo = [
    { id: uid(), title: "Entreno fuerza", kind: "entreno", date: "", minutes: 60, notes: "Pierna + core", done: false, createdAt: now },
    { id: uid(), title: "Preparar sesión fútbol", kind: "tarea", date: "", minutes: 30, notes: "Ejercicios + conos", done: false, createdAt: now },
    { id: uid(), title: "Movilidad", kind: "entreno", date: "", minutes: 15, notes: "Cadera y tobillo", done: true, createdAt: now },
  ];

  items = [...demo, ...items];
  saveItems(items);
  render();
}

function importJsonFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("JSON inválido: se esperaba un array.");

      const ok = confirm("¿Importar y AÑADIR estos elementos a tu lista actual?");
      if (!ok) return;

      // Sanitiza campos mínimos
      const cleaned = data.map((x) => ({
        id: x.id || uid(),
        title: (x.title ?? "").toString().slice(0, 60),
        kind: x.kind === "tarea" ? "tarea" : "entreno",
        date: (x.date ?? "").toString(),
        minutes: x.minutes === "" || x.minutes == null ? "" : Number(x.minutes),
        notes: (x.notes ?? "").toString().slice(0, 200),
        done: !!x.done,
        createdAt: x.createdAt || new Date().toISOString(),
      })).filter((x) => x.title.trim().length > 0);

      items = [...cleaned, ...items];
      saveItems(items);
      render();
      alert(`Importados: ${cleaned.length}`);
    } catch (err) {
      alert(`No se pudo importar: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

els.seedBtn.addEventListener("click", (e) => {
  e.preventDefault();
  seedDemo();
});

els.importFile.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  importJsonFile(file);
  e.target.value = ""; // permite importar el mismo archivo otra vez
});


render();
