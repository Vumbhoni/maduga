const STORAGE_KEY = "mtititi-family-tree-admin-v1";
let familyData = null, adminMode = false, activeParentPath = null, currentSearch = "";

async function loadFamilyTree() {
  const response = await fetch("family-tree.json");
  if (!response.ok) throw new Error(`Unable to load family-tree.json (${response.status})`);
  const original = await response.json();
  try { familyData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || original; }
  catch { familyData = original; }
  document.title = `${familyData.title || "Family Tree"} | Preserving Our Heritage`;
  wireToolbar(); wireAdminForm(); renderTree();
}

function countPeople(person) {
  return 1 + (person.children || []).reduce((sum, child) => sum + countPeople(child), 0);
}
function peopleCount() {
  return (familyData.roots || []).reduce((sum, p) => sum + countPeople(p), 0)
    + (familyData.branches || []).reduce((sum, p) => sum + countPeople(p), 0);
}
function notice(message, error = false) {
  const el = document.getElementById("adminNotice");
  if (el) { el.textContent = message; el.classList.toggle("error", error); }
}
function saveChanges() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(familyData)); }
  catch { notice("Browser storage is unavailable. Export the JSON to keep your changes.", true); }
}
function renderTree() {
  const root = document.getElementById("familyTree"), summary = document.getElementById("summary");
  root.innerHTML = ""; summary.innerHTML = "";
  [`${peopleCount()} recorded family members`, `${(familyData.branches || []).length} family branches`, adminMode ? "Admin mode enabled" : "Searchable and printable"].forEach(text => {
    const pill = document.createElement("span"); pill.className = "pill"; pill.textContent = text; summary.appendChild(pill);
  });
  const roots = document.createElement("div"); roots.className = "root-pair";
  (familyData.roots || []).forEach((p, i) => roots.appendChild(makePerson(p, true, ["roots", i])));
  if (roots.children.length) root.appendChild(roots);
  const branches = document.createElement("div"); branches.className = "branches";
  (familyData.branches || []).forEach((p, i) => branches.appendChild(makePerson(p, false, ["branches", i])));
  root.appendChild(branches);

  const pending = document.getElementById("pendingNames"), section = document.getElementById("pendingSection");
  pending.innerHTML = "";
  (familyData.pendingRelationshipsToConfirm || []).forEach(name => {
    const li = document.createElement("li"); li.textContent = name; pending.appendChild(li);
  });
  section.style.display = pending.children.length ? "" : "none";
  document.getElementById("adminPanel").hidden = !adminMode;
  document.getElementById("exportJson").hidden = !adminMode;
  document.getElementById("adminToggle").textContent = `Admin mode: ${adminMode ? "On" : "Off"}`;
  document.getElementById("adminToggle").setAttribute("aria-pressed", String(adminMode));
  applySearch();
}
function makePerson(person, isRoot = false, path = []) {
  const branch = document.createElement("article"); branch.className = "branch"; branch.dataset.branch = "";
  const head = document.createElement("div"); head.className = "branch-head";
  const card = document.createElement("div"); card.className = `person searchable${isRoot ? " root" : ""}`;
  const name = document.createElement("span"); name.className = "name"; name.textContent = person.name || "Name not recorded"; card.appendChild(name);
  if (person.gender) { const g = document.createElement("span"); g.className = "gender"; g.textContent = person.gender; card.appendChild(g); }
  if (person.notes) { const note = document.createElement("small"); note.textContent = person.notes; card.appendChild(note); }
  head.appendChild(card);
  if (adminMode) {
    const add = document.createElement("button"); add.type = "button"; add.className = "add-descendant";
    add.textContent = "+ Add descendant"; add.setAttribute("aria-label", `Add descendant of ${person.name || "this person"}`);
    add.addEventListener("click", () => openAddDialog(path, person.name || "this person")); head.appendChild(add);
  }
  branch.appendChild(head);
  if (person.children && person.children.length) {
    const toggle = document.createElement("button"); toggle.type = "button"; toggle.className = "branch-toggle";
    toggle.setAttribute("aria-expanded", "true"); toggle.textContent = "Hide descendants −"; head.appendChild(toggle);
    const children = document.createElement("div"); children.className = "children";
    person.children.forEach((child, i) => children.appendChild(makePerson(child, false, path.concat(["children", i]))));
    branch.appendChild(children);
    toggle.addEventListener("click", () => setBranch(toggle, toggle.getAttribute("aria-expanded") !== "true"));
  }
  return branch;
}
function setBranch(button, open) {
  const branch = button.closest("[data-branch]"), children = branch.querySelector(":scope > .children");
  if (!children) return;
  children.style.display = open ? "flex" : "none";
  button.setAttribute("aria-expanded", String(open)); button.textContent = open ? "Hide descendants −" : "Show descendants +";
}
function getByPath(path) { return path.reduce((obj, key) => obj[key], familyData); }
function openAddDialog(path, parentName) {
  activeParentPath = path;
  document.getElementById("parentDescription").textContent = `This person will be added as a child of ${parentName}.`;
  document.getElementById("newPersonName").value = "";
  document.getElementById("newPersonGender").value = "";
  document.getElementById("newPersonNotes").value = "";
  document.getElementById("formError").textContent = "";
  document.getElementById("addPersonDialog").showModal();
  document.getElementById("newPersonName").focus();
}
function wireAdminForm() {
  const dialog = document.getElementById("addPersonDialog");
  document.getElementById("cancelAdd").addEventListener("click", () => dialog.close());
  document.getElementById("addPersonForm").addEventListener("submit", event => {
    event.preventDefault();
    const name = document.getElementById("newPersonName").value.trim();
    if (!name) { document.getElementById("formError").textContent = "Please enter the person's name."; return; }
    const person = { name, gender: document.getElementById("newPersonGender").value };
    const notes = document.getElementById("newPersonNotes").value.trim(); if (notes) person.notes = notes;
    const parent = getByPath(activeParentPath);
    if (!Array.isArray(parent.children)) parent.children = [];
    parent.children.push(person);
    saveChanges(); dialog.close(); renderTree();
    notice(`${name} was added under ${parent.name}. Changes are saved in this browser.`);
  });
}
function wireToolbar() {
  document.getElementById("adminToggle").addEventListener("click", () => {
    adminMode = !adminMode; renderTree();
    if (adminMode) notice("Admin mode is on. Choose Add descendant under the correct parent.");
  });
  document.getElementById("expand").addEventListener("click", () => document.querySelectorAll(".branch-toggle").forEach(b => setBranch(b, true)));
  document.getElementById("collapse").addEventListener("click", () => document.querySelectorAll(".branch-toggle").forEach(b => setBranch(b, false)));
  document.getElementById("print").addEventListener("click", () => { document.querySelectorAll(".children").forEach(el => el.style.display = "flex"); window.print(); });
  document.getElementById("search").addEventListener("input", e => { currentSearch = e.target.value; applySearch(); });
  document.getElementById("clear").addEventListener("click", () => { document.getElementById("search").value = ""; currentSearch = ""; applySearch(); });
  document.getElementById("exportJson").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(familyData, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = "family-tree.json"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    notice("Updated family-tree.json downloaded. Replace the project's JSON file with it to make the changes part of the project.");
  });
  document.getElementById("resetLocal").addEventListener("click", async () => {
    if (!confirm("Discard all browser-saved changes and reload the original family-tree.json?")) return;
    localStorage.removeItem(STORAGE_KEY);
    try {
      const response = await fetch("family-tree.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not reload JSON");
      familyData = await response.json(); renderTree(); notice("Browser changes discarded; original JSON loaded.");
    } catch { notice("Could not reload the original JSON. Refresh the page and try again.", true); }
  });
  window.addEventListener("afterprint", () => document.querySelectorAll(".children").forEach(el => el.style.display = "flex"));
}
function applySearch() {
  const query = currentSearch.trim().toLocaleLowerCase(), people = [...document.querySelectorAll(".searchable")];
  people.forEach(person => {
    const match = person.textContent.toLocaleLowerCase().includes(query);
    person.classList.toggle("hide", Boolean(query) && !match);
    if (query && match) {
      let parent = person.parentElement;
      while (parent) {
        if (parent.classList?.contains("children")) parent.style.display = "flex";
        if (parent.matches?.("[data-branch]")) {
          const button = parent.querySelector(":scope > .branch-head .branch-toggle"); if (button) setBranch(button, true);
        }
        parent = parent.parentElement;
      }
    }
  });
  document.getElementById("noResults").style.display = query && !people.some(p => p.textContent.toLocaleLowerCase().includes(query)) ? "block" : "none";
}
loadFamilyTree().catch(error => {
  const root = document.getElementById("familyTree");
  if (root) root.textContent = `The family tree could not be loaded. Make sure family-tree.json is beside index.html and open the website through a local web server. Details: ${error.message}`;
});
