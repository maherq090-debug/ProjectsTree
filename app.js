/* =========================================
   SETTINGS
========================================= */

const STORAGE_KEY = "project-tree-v1";

// level 0 = Milestone, level 1..7 = Tasks / Subtasks
const MAX_SUBTASK_LEVEL = 7;


/* =========================================
   DATA
========================================= */

let projects = loadProjects();

function loadProjects() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    render();
}


/* =========================================
   HELPERS
========================================= */

function generateId() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now() + "-" + Math.random();
}

function createNode(name, level) {
    return {
        id: generateId(),
        name: name,
        completed: false,
        collapsed: false,
        level: level,
        children: []
    };
}

function askName(message, defaultValue = "") {
    const result = prompt(message, defaultValue);
    if (!result || !result.trim()) {
        return null;
    }
    return result.trim();
}

function findProject(projectId) {
    return projects.find(p => p.id === projectId);
}

function findNode(nodes, id) {
    for (const node of nodes) {
        if (node.id === id) {
            return node;
        }
        const found = findNode(node.children, id);
        if (found) {
            return found;
        }
    }
    return null;
}

function escapeHtml(text) {
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, character => map[character]);
}


/* =========================================
   PROGRESS
========================================= */

// No children: 100 if completed, else 0.
// With children: average of the children's progress.
function calculateNodeProgress(node) {
    if (node.children.length === 0) {
        return node.completed ? 100 : 0;
    }
    const total = node.children.reduce(
        (sum, child) => sum + calculateNodeProgress(child),
        0
    );
    return Math.round(total / node.children.length);
}

function calculateProjectProgress(project) {
    if (project.milestones.length === 0) {
        return 0;
    }
    const total = project.milestones.reduce(
        (sum, milestone) => sum + calculateNodeProgress(milestone),
        0
    );
    return Math.round(total / project.milestones.length);
}


/* =========================================
   ACTIONS
========================================= */

function addProject() {
    const name = askName("اسم المشروع؟");
    if (!name) return;

    projects.push({
        id: generateId(),
        name: name,
        milestones: []
    });
    save();
}

function addMilestone(projectId) {
    const project = findProject(projectId);
    if (!project) return;

    const name = askName("اسم الـ Milestone؟");
    if (!name) return;

    project.milestones.push(createNode(name, 0));
    save();
}

function addChild(projectId, nodeId) {
    const project = findProject(projectId);
    if (!project) return;

    const node = findNode(project.milestones, nodeId);
    if (!node) return;

    if (node.level >= MAX_SUBTASK_LEVEL) {
        alert("وصلت إلى الحد الأقصى: " + MAX_SUBTASK_LEVEL + " مستويات.");
        return;
    }

    const childLevel = node.level + 1;
    const name = askName("اسم المستوى " + childLevel + "؟");
    if (!name) return;

    node.children.push(createNode(name, childLevel));
    node.collapsed = false;
    save();
}

function editNode(projectId, nodeId) {
    const project = findProject(projectId);
    if (!project) return;

    const node = findNode(project.milestones, nodeId);
    if (!node) return;

    const newName = askName("تعديل الاسم:", node.name);
    if (!newName) return;

    node.name = newName;
    save();
}

function toggleNode(projectId, nodeId) {
    const project = findProject(projectId);
    if (!project) return;

    const node = findNode(project.milestones, nodeId);
    if (!node) return;

    // Parents get their progress from their children.
    if (node.children.length > 0) return;

    node.completed = !node.completed;
    save();
}

function deleteNode(projectId, nodeId) {
    const project = findProject(projectId);
    if (!project) return;

    if (!confirm("حذف هذا العنصر وكل ما تحته؟")) return;

    function remove(nodes) {
        const index = nodes.findIndex(node => node.id === nodeId);
        if (index !== -1) {
            nodes.splice(index, 1);
            return true;
        }
        return nodes.some(node => remove(node.children));
    }

    remove(project.milestones);
    save();
}

function deleteProject(projectId) {
    if (!confirm("حذف المشروع بالكامل؟")) return;

    projects = projects.filter(project => project.id !== projectId);
    save();
}


/* =========================================
   NAVIGATION
   view = null            -> الصفحة الرئيسية
   view = {projectId, path:[milestoneId, taskId, ...]} -> شاشة داخلية
========================================= */

let view = null;

function getScreen() {
    if (!view) return null;
    const project = findProject(view.projectId);
    if (!project) return null;

    let nodes = project.milestones;
    let node = null;
    const names = [project.name];

    for (const id of view.path) {
        node = nodes.find(n => n.id === id);
        if (!node) return null;
        names.push(node.name);
        nodes = node.children;
    }
    return { project, node, names };
}

function openNode(projectId, path) {
    view = { projectId: projectId, path: path };
    window.scrollTo(0, 0);
    render();
}

function goBack() {
    if (!view) return;
    view.path.pop();
    if (view.path.length === 0) view = null;
    window.scrollTo(0, 0);
    render();
}


/* =========================================
   RENDER ROW
========================================= */

function renderRow(project, node, path) {
    const row = document.createElement("div");
    const hasChildren = node.children.length > 0;
    const progress = calculateNodeProgress(node);

    row.className = "node level-" + Math.min(node.level, 7) + (hasChildren ? " clickable" : "");

    row.innerHTML = `
        <div class="node-main">
            <input type="checkbox" class="task-checkbox"
                ${node.completed ? "checked" : ""} ${hasChildren ? "disabled" : ""}>
            <div class="node-name ${progress === 100 ? "completed" : ""}">${escapeHtml(node.name)}</div>
            <div class="node-meta">${hasChildren ? node.children.length + " • " : ""}${progress}%</div>
            <div class="node-tools">
                ${node.level < MAX_SUBTASK_LEVEL ? `<button class="small-btn" data-add>+</button>` : ""}
                <button class="small-btn" data-edit>✎</button>
                <button class="small-btn danger" data-delete>✕</button>
            </div>
            ${hasChildren ? `<span class="chevron">‹</span>` : ""}
        </div>
    `;

    const stop = (selector, handler) => {
        const el = row.querySelector(selector);
        if (el) el.addEventListener("click", event => {
            event.stopPropagation();
            handler();
        });
    };

    stop(".task-checkbox", () => {});
    row.querySelector(".task-checkbox")
        .addEventListener("change", () => toggleNode(project.id, node.id));
    stop("[data-add]", () => addChild(project.id, node.id));
    stop("[data-edit]", () => editNode(project.id, node.id));
    stop("[data-delete]", () => deleteNode(project.id, node.id));

    if (hasChildren) {
        row.addEventListener("click", () => openNode(project.id, path));
    }

    return row;
}


/* =========================================
   RENDER HOME (projects)
========================================= */

function renderProject(project) {
    const fragment = document.getElementById("projectTemplate").content.cloneNode(true);
    const card = fragment.querySelector(".project-card");
    const progress = calculateProjectProgress(project);

    card.querySelector(".project-title").textContent = project.name;
    card.querySelector(".progress-fill").style.width = progress + "%";
    card.querySelector(".progress-text").textContent = progress + "%";

    card.querySelector(".add-milestone-btn")
        .addEventListener("click", () => addMilestone(project.id));
    card.querySelector(".delete-project-btn")
        .addEventListener("click", () => deleteProject(project.id));

    const list = card.querySelector(".milestones");

    if (project.milestones.length === 0) {
        list.innerHTML = `<div class="empty">ما فيه Milestones بعد. اضغط «+ Milestone» للبدء.</div>`;
    } else {
        project.milestones.forEach(m => list.appendChild(renderRow(project, m, [m.id])));
    }
    return fragment;
}


/* =========================================
   RENDER SCREEN (داخل milestone أو task)
========================================= */

function renderScreen(screen) {
    const { project, node, names } = screen;
    const progress = calculateNodeProgress(node);
    const canAdd = node.level < MAX_SUBTASK_LEVEL;
    const label = node.level === 0 ? "+ مهمة" : "+ مهمة فرعية";

    const box = document.createElement("section");
    box.className = "project-card";

    box.innerHTML = `
        <div class="screen-head">
            <button class="back-btn">→ رجوع</button>
            <div class="screen-info">
                <div class="eyebrow">${escapeHtml(names.slice(0, -1).join(" › "))}</div>
                <h2 class="project-title">${escapeHtml(node.name)}</h2>
                <div class="progress-row">
                    <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
                    <strong class="progress-text">${progress}%</strong>
                </div>
            </div>
        </div>
        <div class="milestones"></div>
        ${canAdd ? `<button class="primary-btn add-here">${label}</button>` : ""}
    `;

    box.querySelector(".back-btn").addEventListener("click", goBack);

    const addBtn = box.querySelector(".add-here");
    if (addBtn) addBtn.addEventListener("click", () => addChild(project.id, node.id));

    const list = box.querySelector(".milestones");
    if (node.children.length === 0) {
        list.innerHTML = `<div class="empty">ما فيه عناصر هنا بعد.</div>`;
    } else {
        node.children.forEach(child =>
            list.appendChild(renderRow(project, child, [...view.path, child.id]))
        );
    }
    return box;
}


/* =========================================
   RENDER APP
========================================= */

function render() {
    const app = document.getElementById("app");
    const screen = getScreen();
    if (view && !screen) view = null;   // العنصر انحذف

    document.getElementById("addProjectBtn").hidden = !!view;
    app.innerHTML = "";

    if (screen) {
        app.appendChild(renderScreen(screen));
        return;
    }

    if (projects.length === 0) {
        app.innerHTML = `<div class="empty">ما عندك مشاريع بعد. اضغط «+ مشروع جديد» للبدء.</div>`;
        return;
    }
    projects.forEach(project => app.appendChild(renderProject(project)));
}


/* =========================================
   INIT
========================================= */

document.getElementById("addProjectBtn").addEventListener("click", addProject);

// زر الرجوع في أندرويد: يرجع مستوى، وإذا بالرئيسية يطلع من التطبيق
const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
if (CapApp) {
    CapApp.addListener("backButton", () => {
        if (view) goBack();
        else CapApp.exitApp();
    });
}

render();
