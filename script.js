// Freelancer Hub: enhanced dashboard functionality

const STORAGE_KEYS = {
    projects: "freelancerHubProjects",
    tasks: "freelancerHubTasks",
    theme: "freelancerHubTheme"
};

function safeRead(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        return fallback;
    }
}

function safeWrite(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        showToast("Could not save data in this browser.");
    }
}

function getStoredProjects() {
    return safeRead(STORAGE_KEYS.projects, []);
}

function saveProjects(projects) {
    safeWrite(STORAGE_KEYS.projects, projects);
    renderStoredProjects();
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.style.display = "none";
    }, 2800);
}

function addProject() {
    const modal = document.getElementById("projectModal");
    const form = document.getElementById("projectForm");

    form.reset();
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("projectName").focus();
}

function closeProjectModal() {
    const modal = document.getElementById("projectModal");
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
}

function createProjectCard(project) {
    const article = document.createElement("article");
    article.className = "project-card";
    article.dataset.projectId = project.id;
    article.dataset.search = [
        project.name,
        project.client,
        project.description
    ].join(" ").toLowerCase();

    const top = document.createElement("div");
    top.className = "project-card-top";

    const logo = document.createElement("div");
    logo.className = "project-logo purple";
    logo.textContent = "✧";

    const menu = document.createElement("button");
    menu.className = "dots";
    menu.textContent = "•••";
    menu.setAttribute("aria-label", "Project actions");
    menu.addEventListener("click", () => {
        cycleProjectStatus(project.id);
    });

    top.append(logo, menu);

    const title = document.createElement("h3");
    title.textContent = project.name;

    const client = document.createElement("p");
    client.className = "client-name";
    client.textContent = project.client || "No client specified";

    const status = document.createElement("span");
    status.className = "project-status";
    status.textContent = project.status;

    if (project.status === "Completed") {
        status.classList.add("completed");
    } else if (project.status === "Under Review") {
        status.classList.add("review");
    }

    const bottom = document.createElement("div");
    bottom.className = "project-card-bottom";

    const budget = document.createElement("div");
    const budgetLabel = document.createElement("p");
    budgetLabel.textContent = "Project Budget";

    const budgetValue = document.createElement("strong");
    budgetValue.textContent = project.budget
        ? "₹" + Number(project.budget).toLocaleString("en-IN")
        : "Not set";

    budget.append(budgetLabel, budgetValue);

    const deadline = document.createElement("div");
    const deadlineLabel = document.createElement("p");
    deadlineLabel.textContent = "Deadline";

    const deadlineValue = document.createElement("strong");
    deadlineValue.textContent = project.deadline || "Not set";

    deadline.append(deadlineLabel, deadlineValue);
    bottom.append(budget, deadline);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const statusButton = document.createElement("button");
    statusButton.className = "small-action";
    statusButton.textContent = "Next status";
    statusButton.addEventListener("click", () => {
        cycleProjectStatus(project.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "small-action";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
        deleteProject(project.id);
    });

    actions.append(statusButton, deleteButton);
    article.append(top, title, client, status, bottom, actions);

    return article;
}

function renderStoredProjects() {
    const grid = document.getElementById("projectGrid");

    grid.querySelectorAll("[data-stored-project='true']")
        .forEach(card => card.remove());

    const projects = getStoredProjects();

    projects.slice().reverse().forEach(project => {
        const card = createProjectCard(project);
        card.dataset.storedProject = "true";
        grid.prepend(card);
    });

    updateProjectCounts();
    applyProjectFilters();
}

function updateProjectCounts() {
    const projects = getStoredProjects();

    const activeExisting = [
        ...document.querySelectorAll("#projectGrid .project-card")
    ].filter(card =>
        !card.dataset.storedProject &&
        !card.querySelector(".project-status.completed")
    );

    const storedActive = projects.filter(
        project => project.status !== "Completed"
    ).length;

    document.getElementById("activeCount").textContent =
        String(activeExisting.length + storedActive).padStart(2, "0");
}

document.getElementById("projectForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("projectName").value.trim();
    if (!name) return;

    const project = {
        id: window.crypto?.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()) + Math.random().toString(16).slice(2),
        name,
        client: document.getElementById("projectClient").value.trim(),
        budget: document.getElementById("projectBudget").value,
        deadline: document.getElementById("projectDeadline").value,
        status: document.getElementById("projectStatusInput").value,
        description: document.getElementById("projectDescription").value.trim(),
        createdAt: new Date().toISOString()
    };

    const projects = getStoredProjects();
    projects.push(project);

    saveProjects(projects);
    closeProjectModal();
    showToast("Project saved successfully!");
});

function cycleProjectStatus(id) {
    const projects = getStoredProjects();
    const project = projects.find(item => item.id === id);

    if (!project) return;

    const statuses = ["In Progress", "Under Review", "Completed"];
    const currentIndex = statuses.indexOf(project.status);

    project.status = statuses[(currentIndex + 1) % statuses.length];

    saveProjects(projects);
    showToast("Project status: " + project.status);
}

function deleteProject(id) {
    const projects = getStoredProjects();
    const project = projects.find(item => item.id === id);

    if (!project) return;

    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) {
        return;
    }

    saveProjects(projects.filter(item => item.id !== id));
    showToast("Project deleted.");
}

function applyProjectFilters() {
    const query = document.getElementById("searchInput")
        .value.toLowerCase().trim();

    const filter = document.getElementById("projectStatusFilter").value;
    let visibleCount = 0;

    document.querySelectorAll("#projectGrid .project-card").forEach(card => {
        const statusText =
            card.querySelector(".project-status")?.textContent || "";

        const statusMatch =
            filter === "all" ||
            (filter === "progress" && statusText === "In Progress") ||
            (filter === "review" && statusText === "Under Review") ||
            (filter === "completed" && statusText === "Completed");

        const searchMatch =
            !query ||
            card.textContent.toLowerCase().includes(query) ||
            (card.dataset.search || "").includes(query);

        card.style.display = statusMatch && searchMatch ? "" : "none";

        if (statusMatch && searchMatch) visibleCount++;
    });

    document.getElementById("noResults").style.display =
        visibleCount ? "none" : "block";
}

document.getElementById("searchInput")
    .addEventListener("input", applyProjectFilters);

document.getElementById("projectStatusFilter")
    .addEventListener("change", applyProjectFilters);

function exportProjects() {
    const projects = getStoredProjects();

    const sampleCards = [
        ...document.querySelectorAll("#projectGrid .project-card")
    ]
        .filter(card => !card.dataset.storedProject)
        .map(card => ({
            name: card.querySelector("h3")?.textContent || "",
            client: card.querySelector(".client-name")?.textContent || "",
            budget: card.querySelector(".project-card-bottom strong")?.textContent || "",
            status: card.querySelector(".project-status")?.textContent || ""
        }));

    const rows = [
        ["Project", "Client", "Budget", "Deadline", "Status", "Notes"]
    ];

    projects.forEach(project => {
        rows.push([
            project.name,
            project.client,
            project.budget,
            project.deadline,
            project.status,
            project.description
        ]);
    });

    sampleCards.forEach(project => {
        rows.push([
            project.name,
            project.client,
            project.budget,
            "",
            project.status,
            "Sample project"
        ]);
    });

    const csv = rows.map(row =>
        row.map(value =>
            '"' + String(value ?? "").replace(/"/g, '""') + '"'
        ).join(",")
    ).join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "freelancer-projects.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    showToast("Project CSV exported.");
}

function toggleTheme() {
    document.body.classList.toggle("light-mode");

    const theme = document.body.classList.contains("light-mode")
        ? "light"
        : "dark";

    try {
        localStorage.setItem(STORAGE_KEYS.theme, theme);
    } catch (error) {}

    document.getElementById("themeToggle").textContent =
        theme === "light" ? "☾" : "☼";

    showToast(theme === "light"
        ? "Light theme enabled"
        : "Dark theme enabled");
}

function loadTheme() {
    let theme = "dark";

    try {
        theme = localStorage.getItem(STORAGE_KEYS.theme) || "dark";
    } catch (error) {}

    document.body.classList.toggle("light-mode", theme === "light");

    document.getElementById("themeToggle").textContent =
        theme === "light" ? "☾" : "☼";
}

function getTasks() {
    const stored = safeRead(STORAGE_KEYS.tasks, null);
    if (stored) return stored;

    return [...document.querySelectorAll("#taskList .task")].map(
        (label, index) => ({
            id: "default-" + index,
            title: label.querySelector("h4")?.textContent || "Task",
            description: label.querySelector(".task-info p")?.textContent || "",
            due: label.querySelector(".due")?.textContent || "Today",
            done: label.querySelector("input")?.checked || false
        })
    );
}

function renderTasks() {
    const list = document.getElementById("taskList");
    const tasks = getTasks();

    list.replaceChildren();

    tasks.forEach(taskData => {
        const label = document.createElement("label");
        label.className = "task" + (taskData.done ? " done" : "");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !!taskData.done;

        checkbox.addEventListener("change", () => {
            const updated = getTasks();
            const task = updated.find(item => item.id === taskData.id);

            if (task) task.done = checkbox.checked;

            safeWrite(STORAGE_KEYS.tasks, updated);
            renderTasks();

            showToast(checkbox.checked
                ? "Task completed"
                : "Task reopened");
        });

        const info = document.createElement("div");
        info.className = "task-info";

        const title = document.createElement("h4");
        title.textContent = taskData.title;

        const description = document.createElement("p");
        description.textContent = taskData.description || "Personal task";

        info.append(title, description);

        const due = document.createElement("span");
        due.className = "due";
        due.textContent = taskData.due || "No deadline";

        label.append(checkbox, info, due);
        list.append(label);
    });

    const completed = tasks.filter(task => task.done).length;

    document.getElementById("completedCount").textContent =
        String(completed);

    document.getElementById("taskProgressNote").textContent =
        `${completed} of ${tasks.length} tasks completed · saved in this browser`;
}

function addTask() {
    const input = document.getElementById("newTaskInput");
    const title = input.value.trim();

    if (!title) {
        showToast("Enter a task name first.");
        input.focus();
        return;
    }

    const tasks = getTasks();

    tasks.push({
        id: window.crypto?.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()),
        title,
        description: "Added to your task list",
        due: "Upcoming",
        done: false
    });

    safeWrite(STORAGE_KEYS.tasks, tasks);
    input.value = "";

    renderTasks();
    showToast("Task added.");
}

document.getElementById("newTaskInput").addEventListener("keydown", event => {
    if (event.key === "Enter") addTask();
});

document.getElementById("projectModal").addEventListener("click", event => {
    if (event.target.id === "projectModal") closeProjectModal();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeProjectModal();
});

// Restore saved browser data on page load.
loadTheme();
renderStoredProjects();
renderTasks();
