async function loadFamilyTree() {
  const response = await fetch("family-tree.json");
  if (!response.ok) throw new Error(`Unable to load family-tree.json (${response.status})`);
  const data = await response.json();

  document.title = `${data.title || "Family Tree"} | Preserving Our Heritage`;
  const root = document.getElementById("familyTree");
  const summary = document.getElementById("summary");

  const countPeople = person => 1 + (person.children || []).reduce((sum, child) => sum + countPeople(child), 0);
  const branchPeople = (data.roots || []).reduce((sum, p) => sum + countPeople(p), 0)
    + (data.branches || []).reduce((sum, p) => sum + countPeople(p), 0);

  summary.innerHTML = "";
  [`${branchPeople} recorded family members`, `${(data.branches || []).length} family branches`, "Searchable and printable"].forEach(label => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = label;
    summary.appendChild(pill);
  });

  function makePerson(person, isRoot = false) {
    const branch = document.createElement("article");
    branch.className = "branch";
    branch.dataset.branch = "";

    const head = document.createElement("div");
    head.className = "branch-head";
    const card = document.createElement("div");
    card.className = `person searchable${isRoot ? " root" : ""}`;
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = person.name || "Name not recorded";
    card.appendChild(name);

    if (person.gender) {
      const gender = document.createElement("span");
      gender.className = "gender";
      gender.textContent = person.gender;
      card.appendChild(gender);
    }
    if (person.notes) {
      const note = document.createElement("small");
      note.textContent = person.notes;
      card.appendChild(note);
    }

    head.appendChild(card);
    branch.appendChild(head);

    if (person.children && person.children.length) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "branch-toggle";
      toggle.setAttribute("aria-expanded", "true");
      toggle.textContent = "Hide descendants −";
      head.appendChild(toggle);

      const children = document.createElement("div");
      children.className = "children";
      person.children.forEach(child => children.appendChild(makePerson(child)));
      branch.appendChild(children);

      toggle.addEventListener("click", () => setBranch(toggle, toggle.getAttribute("aria-expanded") !== "true"));
    }
    return branch;
  }

  function setBranch(button, open) {
    const branch = button.closest("[data-branch]");
    const children = branch.querySelector(":scope > .children");
    if (!children) return;
    children.style.display = open ? "flex" : "none";
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "Hide descendants −" : "Show descendants +";
  }

  root.innerHTML = "";
  const roots = document.createElement("div");
  roots.className = "root-pair";
  (data.roots || []).forEach(person => roots.appendChild(makePerson(person, true)));
  if (roots.children.length) root.appendChild(roots);

  const branches = document.createElement("div");
  branches.className = "branches";
  (data.branches || []).forEach(person => branches.appendChild(makePerson(person)));
  root.appendChild(branches);

  const pending = document.getElementById("pendingNames");
  const pendingSection = document.getElementById("pendingSection");
  pending.innerHTML = "";
  (data.pendingRelationshipsToConfirm || []).forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    pending.appendChild(li);
  });
  pendingSection.style.display = pending.children.length ? "" : "none";

  const allToggles = () => [...document.querySelectorAll(".branch-toggle")];
  document.getElementById("expand").addEventListener("click", () => {
    allToggles().forEach(button => setBranch(button, true));
  });
  document.getElementById("collapse").addEventListener("click", () => {
    allToggles().forEach(button => setBranch(button, false));
  });
  document.getElementById("print").addEventListener("click", () => {
    document.querySelectorAll(".children").forEach(el => el.style.display = "flex");
    window.print();
  });

  const search = document.getElementById("search");
  const people = [...document.querySelectorAll(".searchable")];
  search.addEventListener("input", () => {
    const query = search.value.trim().toLocaleLowerCase();
    people.forEach(person => {
      const match = person.textContent.toLocaleLowerCase().includes(query);
      person.classList.toggle("hide", Boolean(query) && !match);
      if (query && match) {
        let parent = person.parentElement;
        while (parent) {
          if (parent.classList?.contains("children")) parent.style.display = "flex";
          if (parent.matches?.("[data-branch]")) {
            const button = parent.querySelector(":scope > .branch-head .branch-toggle");
            if (button) setBranch(button, true);
          }
          parent = parent.parentElement;
        }
      }
    });
    document.getElementById("noResults").style.display =
      query && !people.some(p => p.textContent.toLocaleLowerCase().includes(query)) ? "block" : "none";
  });

  document.getElementById("clear").addEventListener("click", () => {
    search.value = "";
    people.forEach(person => person.classList.remove("hide"));
    document.getElementById("noResults").style.display = "none";
  });

  window.addEventListener("afterprint", () => {
    document.querySelectorAll(".children").forEach(el => el.style.display = "flex");
  });
}

loadFamilyTree().catch(error => {
  const root = document.getElementById("familyTree");
  if (root) root.textContent = `The family tree could not be loaded. Make sure family-tree.json is beside index.html and open the website through a local web server. Details: ${error.message}`;
});
