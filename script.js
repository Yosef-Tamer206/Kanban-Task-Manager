      const Status = { ToDo: "todo", InProgress: "in-progress", Completed: "completed" };
      const LIMITS = { title: { minLength: 3, maxLength: 100 }, description: { maxLength: 500 } };
      const STORAGE_KEY = "kanban-tasks";
      const COLUMNS = [
        { id: Status.ToDo, title: "To Do", icon: "fa-solid fa-clipboard-list" },
        { id: Status.InProgress, title: "In Progress", icon: "fa-solid fa-spinner" },
        { id: Status.Completed, title: "Completed", icon: "fa-solid fa-circle-check" },
      ];
      const TIME = { MINUTE: 6e4, HOUR: 36e5, DAY: 864e5, WEEK_DAYS: 7, DUE_SOON_DAYS: 2, NOTIFICATION_DURATION: 3e3, FADE_OUT_DURATION: 300 };

      function byId(id) {
        const el = document.getElementById(id);
        if (!el) throw new Error(`Element with id '${id}' not found`);
        return el;
      }

      class KanbanApp {
        constructor() {
          this.tasks = [];
          this.editingTaskId = null;
          this.formElement = byId("task-form");
          this.titleInput = byId("task-title");
          this.descriptionInput = byId("task-description");
          this.dueDateInput = byId("task-due-date");
          this.prioritySelect = byId("task-priority");
          this.columnsContainer = byId("columns-container");
          this.modalOverlay = byId("modal-overlay");
          this.addTaskBtn = byId("add-task-btn");
          this.closeModalBtn = byId("close-modal-btn");
          this.cancelBtn = byId("cancel-btn");
          this.charCount = byId("char-count");
          this.titleError = byId("title-error");
          this.dateError = byId("date-error");
          this.descriptionError = byId("description-error");
          this.modalTitle = byId("modal-title");
          this.modalIcon = byId("modal-icon");
          this.submitBtn = byId("submit-btn");
          this.submitBtnText = byId("submit-btn-text");
          this.loadTasks();
          this.bindEvents();
          this.render();
        }

        loadTasks() {
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            this.tasks = raw === null ? [] : JSON.parse(raw);
          } catch (e) {
            console.error("Failed to load from localStorage:", e);
            this.tasks = [];
          }
        }

        saveTasks() {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tasks));
          } catch (e) {
            console.error("Failed to save to localStorage:", e);
          }
        }

        generateId() {
          return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }

        addTask(data) {
          const task = {
            id: this.generateId(),
            title: data.title.trim(),
            description: data.description.trim(),
            status: Status.ToDo,
            priority: data.priority,
            dueDate: data.dueDate,
            createdAt: new Date().toISOString(),
          };
          this.tasks.push(task);
          this.saveTasks();
          this.render();
        }

        updateTaskStatus(id, status) {
          const task = this.tasks.find((t) => t.id === id);
          if (task) {
            task.status = status;
            this.saveTasks();
            this.render();
          }
        }

        deleteTask(id) {
          this.tasks = this.tasks.filter((t) => t.id !== id);
          this.saveTasks();
          this.render();
        }

        updateTask(id, data) {
          const task = this.tasks.find((t) => t.id === id);
          if (task) {
            task.title = data.title.trim();
            task.description = data.description.trim();
            task.priority = data.priority;
            task.dueDate = data.dueDate;
            this.saveTasks();
            this.render();
          }
        }

        getTaskById(id) {
          return this.tasks.find((t) => t.id === id);
        }

        getTasksByStatus(status) {
          return this.tasks.filter((t) => t.status === status);
        }

        bindEvents() {
          this.addTaskBtn.addEventListener("click", () => this.openModal());
          this.closeModalBtn.addEventListener("click", () => this.closeModal());
          this.cancelBtn.addEventListener("click", () => this.closeModal());
          this.modalOverlay.addEventListener("click", (e) => {
            if (e.target === this.modalOverlay) this.closeModal();
          });
          document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !this.modalOverlay.classList.contains("hidden")) this.closeModal();
          });
          this.descriptionInput.addEventListener("input", () => {
            const len = this.descriptionInput.value.length;
            this.charCount.textContent = `${len}/${LIMITS.description.maxLength}`;
            if (len > LIMITS.description.maxLength) {
              this.charCount.classList.add("text-red-500");
              this.charCount.classList.remove("text-slate-400");
            } else {
              this.charCount.classList.remove("text-red-500");
              this.charCount.classList.add("text-slate-400");
            }
          });
          this.titleInput.addEventListener("input", () => this.clearFieldError(this.titleInput, this.titleError));
          this.dueDateInput.addEventListener("input", () => this.clearFieldError(this.dueDateInput, this.dateError));
          this.formElement.addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleFormSubmit();
          });
          this.columnsContainer.addEventListener("click", (e) => {
            const target = e.target;
            if (target.classList.contains("status-btn")) {
              const id = target.dataset.taskId;
              const status = target.dataset.status;
              if (id && status) this.updateTaskStatus(id, status);
            }
            if (target.classList.contains("delete-btn")) {
              const id = target.dataset.taskId;
              if (id) this.deleteTask(id);
            }
            if (target.classList.contains("edit-btn")) {
              const id = target.dataset.taskId;
              if (id) this.openEditModal(id);
            }
          });
        }

        openModal() {
          this.editingTaskId = null;
          this.setModalMode("add");
          this.modalOverlay.classList.remove("hidden");
          this.modalOverlay.classList.add("flex");
          document.body.style.overflow = "hidden";
          this.titleInput.focus();
        }

        openEditModal(id) {
          const task = this.getTaskById(id);
          if (!task) return;
          this.editingTaskId = id;
          this.setModalMode("edit");
          this.titleInput.value = task.title;
          this.descriptionInput.value = task.description;
          this.dueDateInput.value = task.dueDate;
          this.prioritySelect.value = task.priority;
          this.charCount.textContent = `${task.description.length}/${LIMITS.description.maxLength}`;
          this.modalOverlay.classList.remove("hidden");
          this.modalOverlay.classList.add("flex");
          document.body.style.overflow = "hidden";
          this.titleInput.focus();
        }

        setModalMode(mode) {
          if (mode === "add") {
            this.modalTitle.textContent = "Create New Task";
            this.modalIcon.className = "fa-solid fa-plus-circle text-indigo-500";
            this.submitBtnText.textContent = "Add Task";
            const icon = this.submitBtn.querySelector("i");
            if (icon) icon.classList.replace("fa-save", "fa-plus");
          } else {
            this.modalTitle.textContent = "Edit Task";
            this.modalIcon.className = "fa-solid fa-pen-to-square text-indigo-500";
            this.submitBtnText.textContent = "Save Changes";
            const icon = this.submitBtn.querySelector("i");
            if (icon) icon.classList.replace("fa-plus", "fa-save");
          }
        }

        closeModal() {
          this.editingTaskId = null;
          this.modalOverlay.classList.add("hidden");
          this.modalOverlay.classList.remove("flex");
          document.body.style.overflow = "";
          this.formElement.reset();
          this.charCount.textContent = `0/${LIMITS.description.maxLength}`;
          this.clearAllErrors();
        }

        validateForm() {
          let valid = true;
          this.clearAllErrors();
          const title = this.titleInput.value.trim();
          if (!title) {
            this.showFieldError(this.titleInput, this.titleError, "Task title is required");
            valid = false;
          } else if (title.length < LIMITS.title.minLength) {
            this.showFieldError(this.titleInput, this.titleError, `Title must be at least ${LIMITS.title.minLength} characters`);
            valid = false;
          } else if (title.length > LIMITS.title.maxLength) {
            this.showFieldError(this.titleInput, this.titleError, `Title must be less than ${LIMITS.title.maxLength} characters`);
            valid = false;
          }
          const dueDate = this.dueDateInput.value;
          if (dueDate) {
            const due = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (due < today) {
              this.showFieldError(this.dueDateInput, this.dateError, "Due date cannot be in the past");
              valid = false;
            }
          }
          if (this.descriptionInput.value.length > LIMITS.description.maxLength) {
            this.showFieldError(this.descriptionInput, this.descriptionError, `Description must be less than ${LIMITS.description.maxLength} characters`);
            valid = false;
          }
          return valid;
        }

        showFieldError(input, errorEl, message) {
          input.classList.add("border-red-500", "focus:ring-red-500", "focus:border-red-500");
          input.classList.remove("border-slate-300", "focus:ring-indigo-500", "focus:border-indigo-500");
          errorEl.textContent = message;
          errorEl.classList.remove("hidden");
        }

        clearFieldError(input, errorEl) {
          input.classList.remove("border-red-500", "focus:ring-red-500", "focus:border-red-500");
          input.classList.add("border-slate-300", "focus:ring-indigo-500", "focus:border-indigo-500");
          errorEl.classList.add("hidden");
        }

        clearAllErrors() {
          this.clearFieldError(this.titleInput, this.titleError);
          this.clearFieldError(this.dueDateInput, this.dateError);
          this.clearFieldError(this.descriptionInput, this.descriptionError);
        }

        handleFormSubmit() {
          if (!this.validateForm()) return;
          const data = {
            title: this.titleInput.value,
            description: this.descriptionInput.value,
            dueDate: this.dueDateInput.value,
            priority: this.prioritySelect.value,
          };
          if (this.editingTaskId) {
            this.updateTask(this.editingTaskId, data);
            this.closeModal();
            this.showNotification("Task updated successfully!", "success");
          } else {
            this.addTask(data);
            this.closeModal();
            this.showNotification("Task added successfully!", "success");
          }
        }

        render() {
          this.columnsContainer.innerHTML = "";
          COLUMNS.forEach((col) => {
            const colEl = this.createColumnElement(col);
            this.columnsContainer.appendChild(colEl);
          });
        }

        createColumnElement(col) {
          const el = document.createElement("div");
          el.className = "bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex flex-col min-h-[500px] border border-slate-200/50 shadow-sm";
          el.dataset.status = col.id;
          const tasks = this.getTasksByStatus(col.id);
          const colors = {
            [Status.ToDo]: { icon: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200" },
            [Status.InProgress]: { icon: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200" },
            [Status.Completed]: { icon: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" },
          }[col.id];
          el.innerHTML = `
      <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center">
          <i class="${col.icon} ${colors.icon} text-lg"></i>
        </div>
        <div class="flex-1">
          <h2 class="font-semibold text-slate-800">${col.title}</h2>
          <p class="text-xs text-slate-400">${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}</p>
        </div>
      </div>
      <div class="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 -mr-1" id="tasks-${col.id}">
        ${
          tasks.length === 0
            ? `<div class="flex flex-col items-center justify-center py-12 text-slate-400">
              <i class="fa-regular fa-folder-open text-4xl mb-3 opacity-50"></i>
              <p class="text-sm">No tasks yet</p>
              <p class="text-xs mt-1">Click + to add one</p>
            </div>`
            : tasks.map((t) => this.createTaskCardHTML(t)).join("")
        }
      </div>
    `;
          return el;
        }

        createTaskCardHTML(task) {
          const dueLabel = task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== Status.Completed;
          const isDueSoon = task.dueDate && !isOverdue && this.isDueSoon(task.dueDate) && task.status !== Status.Completed;
          const isCompleted = task.status === Status.Completed;
          const priorityMap = {
            high: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500", label: "High Priority" },
            medium: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500", label: "Medium" },
            low: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500", label: "Low" },
          };
          const p = priorityMap[task.priority || "medium"];
          const timeAgo = this.getTimeAgo(task.createdAt);
          const taskNumber = this.getTaskNumber(task.id);
          const statusDots = { [Status.ToDo]: "bg-slate-300", [Status.InProgress]: "bg-amber-400", [Status.Completed]: "bg-emerald-500" };
          return `
      <div class="group bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-200 ${isOverdue ? "ring-2 ring-red-100 border-red-200" : ""} ${isCompleted ? "opacity-75" : ""}" data-task-id="${task.id}">
        <!-- Top Bar -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${statusDots[task.status]}"></span>
            <span class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">#${taskNumber}</span>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="edit-btn text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 w-7 h-7 rounded-lg flex items-center justify-center transition-colors" data-task-id="${task.id}" title="Edit task">
              <i class="fa-solid fa-pen text-xs pointer-events-none"></i>
            </button>
            <button class="delete-btn text-slate-400 hover:text-red-500 hover:bg-red-50 w-7 h-7 rounded-lg flex items-center justify-center transition-colors" data-task-id="${task.id}" title="Delete task">
              <i class="fa-solid fa-trash-can text-xs pointer-events-none"></i>
            </button>
          </div>
        </div>

        <!-- Title -->
        <h3 class="font-semibold text-slate-800 mb-2 leading-snug ${isCompleted ? "line-through text-slate-500" : ""}">
          ${this.escapeHtml(task.title)}
        </h3>

        <!-- Description -->
        ${
          task.description
            ? `
          <p class="text-slate-500 text-sm mb-4 leading-relaxed line-clamp-2">
            ${this.escapeHtml(task.description)}
          </p>
        `
            : ""
        }

        <!-- Tags Row -->
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <!-- Priority Badge -->
          <span class="${p.bg} ${p.text} text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wide">
            <span class="w-1.5 h-1.5 rounded-full ${p.dot}"></span>
            ${p.label}
          </span>

          ${
            isOverdue
              ? `
            <span class="bg-red-100 text-red-600 text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
              <i class="fa-solid fa-triangle-exclamation"></i>
              Overdue
            </span>
          `
              : ""
          }

          ${
            isDueSoon
              ? `
            <span class="bg-orange-100 text-orange-600 text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide">
              Due Soon
            </span>
          `
              : ""
          }

          ${
            isCompleted
              ? `
            <span class="bg-emerald-100 text-emerald-600 text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
              <i class="fa-solid fa-check"></i>
              Done
            </span>
          `
              : ""
          }
        </div>

        <!-- Meta Info -->
        <div class="flex items-center gap-3 text-xs text-slate-400 pb-3 mb-3 border-b border-slate-100">
          ${
            dueLabel
              ? `
            <div class="flex items-center gap-1.5 ${isOverdue ? "text-red-500" : isDueSoon ? "text-orange-500" : ""}">
              <i class="fa-regular fa-calendar"></i>
              <span>${dueLabel}</span>
            </div>
          `
              : ""
          }
          <div class="flex items-center gap-1.5" title="Created ${new Date(task.createdAt).toLocaleString()}">
            <i class="fa-regular fa-clock"></i>
            <span>${timeAgo}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-2">
          ${this.getStatusButtonsHTML(task)}
        </div>
      </div>
    `;
        }

        isDueSoon(dueDate) {
          const due = new Date(dueDate);
          const now = new Date();
          const days = Math.ceil((due.getTime() - now.getTime()) / TIME.DAY);
          return days >= 0 && days <= TIME.DUE_SOON_DAYS;
        }

        getTaskNumber(id) {
          const index = this.tasks.findIndex((t) => t.id === id);
          return String(index + 1).padStart(3, "0");
        }

        getTimeAgo(dateStr) {
          const date = new Date(dateStr);
          const diff = new Date().getTime() - date.getTime();
          const minutes = Math.floor(diff / TIME.MINUTE);
          const hours = Math.floor(diff / TIME.HOUR);
          const days = Math.floor(diff / TIME.DAY);
          if (minutes < 1) return "Just now";
          if (minutes < 60) return `${minutes}m ago`;
          if (hours < 24) return `${hours}h ago`;
          if (days < TIME.WEEK_DAYS) return `${days}d ago`;
          return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }

        getStatusButtonsHTML(task) {
          const buttons = [];
          const base = "text-[11px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95";
          if (task.status !== Status.ToDo) {
            buttons.push(`
        <button class="status-btn ${base} bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700" data-task-id="${task.id}" data-status="${Status.ToDo}">
          <i class="fa-solid fa-arrow-rotate-left pointer-events-none"></i> <span class="pointer-events-none">To Do</span>
        </button>
      `);
          }
          if (task.status !== Status.InProgress) {
            buttons.push(`
        <button class="status-btn ${base} bg-amber-100 text-amber-700 hover:bg-amber-200" data-task-id="${task.id}" data-status="${Status.InProgress}">
          <i class="fa-solid fa-play pointer-events-none"></i> <span class="pointer-events-none">Start</span>
        </button>
      `);
          }
          if (task.status !== Status.Completed) {
            buttons.push(`
        <button class="status-btn ${base} bg-emerald-100 text-emerald-700 hover:bg-emerald-200" data-task-id="${task.id}" data-status="${Status.Completed}">
          <i class="fa-solid fa-check pointer-events-none"></i> <span class="pointer-events-none">Complete</span>
        </button>
      `);
          }
          return buttons.join("");
        }

        escapeHtml(str) {
          const div = document.createElement("div");
          div.textContent = str;
          return div.innerHTML;
        }

        showNotification(message, type) {
          const existing = document.querySelector(".notification");
          if (existing) existing.remove();
          const el = document.createElement("div");
          el.className = `notification ${type}`;
          el.textContent = message;
          document.body.appendChild(el);
          setTimeout(() => {
            el.classList.add("fade-out");
            setTimeout(() => el.remove(), TIME.FADE_OUT_DURATION);
          }, TIME.NOTIFICATION_DURATION);
        }
      }

      document.addEventListener("DOMContentLoaded", () => {
        new KanbanApp();
      });
