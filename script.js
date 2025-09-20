class TodoApp {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem('todos')) || [];
        this.currentFilter = 'all';
        this.editingId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        // Add todo
        document.getElementById('addBtn').addEventListener('click', () => this.addTodo());
        document.getElementById('todoInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });

        // Clear all
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());

        // Auto-save on page unload
        window.addEventListener('beforeunload', () => this.save());
    }

    addTodo() {
        const input = document.getElementById('todoInput');
        const text = input.value.trim();

        if (!text) {
            this.shakeInput();
            return;
        }

        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.todos.unshift(todo);
        input.value = '';
        this.save();
        this.render();
        
        // Focus back on input for continuous adding
        input.focus();
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.save();
            this.render();
        }
    }

    deleteTodo(id) {
        const todoElement = document.querySelector(`[data-id="${id}"]`);
        todoElement.classList.add('removing');
        
        setTimeout(() => {
            this.todos = this.todos.filter(t => t.id !== id);
            this.save();
            this.render();
        }, 400);
    }

    startEdit(id) {
        this.editingId = id;
        this.renderTodos();
        
        const editingElement = document.querySelector(`[data-id="${id}"] .todo-text`);
        editingElement.focus();
        
        // Add tooltip for editing instructions
        this.showEditTooltip(editingElement);
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(editingElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    showEditTooltip(element) {
        // Remove any existing tooltip
        const existingTooltip = document.querySelector('.edit-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'edit-tooltip';
        tooltip.innerHTML = `
            <div>Press <kbd>Enter</kbd> for new line</div>
            <div>Press <kbd>Ctrl+Enter</kbd> to save</div>
            <div>Press <kbd>Esc</kbd> to cancel</div>
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
        tooltip.style.left = rect.left + 'px';
        
        // Remove tooltip after 3 seconds or when editing ends
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
        }, 3000);
    }

    saveEdit(id, newText) {
        const todo = this.todos.find(t => t.id === id);
        if (todo && newText.trim()) {
            // Convert HTML breaks back to newlines for storage
            const cleanText = newText.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
            todo.text = cleanText;
            this.editingId = null;
            this.save();
            this.render();
        } else {
            this.cancelEdit();
        }
    }

    handleEditKeydown(event, id) {
        // Allow Enter for new lines, Ctrl+Enter or Cmd+Enter to save
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            const element = event.target;
            this.saveEdit(id, element.innerHTML);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.cancelEdit();
        }
        // Allow normal Enter key to create line breaks
    }

    cancelEdit() {
        this.editingId = null;
        this.render();
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.renderTodos();
    }

    clearAll() {
        if (this.todos.length === 0) return;
        
        if (confirm('Are you sure you want to clear all tasks?')) {
            // Animate all items out
            document.querySelectorAll('.todo-item').forEach((item, index) => {
                setTimeout(() => {
                    item.classList.add('removing');
                }, index * 50);
            });
            
            setTimeout(() => {
                this.todos = [];
                this.save();
                this.render();
            }, 500);
        }
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            case 'pending':
                return this.todos.filter(todo => !todo.completed);
            default:
                return this.todos;
        }
    }

    shakeInput() {
        const input = document.getElementById('todoInput');
        input.style.animation = 'none';
        input.offsetHeight; // Trigger reflow
        input.style.animation = 'shake 0.5s ease';
        input.style.borderColor = '#ff6b6b';
        
        setTimeout(() => {
            input.style.borderColor = '';
            input.style.animation = '';
        }, 500);
    }

    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const pending = total - completed;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
    }

    renderTodos() {
        const container = document.getElementById('todosContainer');
        const filteredTodos = this.getFilteredTodos();
        
        if (filteredTodos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${this.currentFilter === 'completed' ? '✅' : this.currentFilter === 'pending' ? '⏰' : '🎯'}</div>
                    <h3>No ${this.currentFilter === 'all' ? 'tasks' : this.currentFilter + ' tasks'} found!</h3>
                    <p>${this.currentFilter === 'all' ? 'Add your first task above to get started.' : `Switch to "All" to see your other tasks.`}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTodos.map(todo => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
                     onclick="todoApp.toggleTodo(${todo.id})"></div>
                
                <div class="todo-text ${this.editingId === todo.id ? 'editing' : ''}"
                     ${this.editingId === todo.id ? 'contenteditable="true"' : ''}
                     onclick="${this.editingId === todo.id ? '' : `todoApp.startEdit(${todo.id})`}"
                     onblur="${this.editingId === todo.id ? `todoApp.saveEdit(${todo.id}, this.innerHTML)` : ''}"
                     onkeydown="${this.editingId === todo.id ? `todoApp.handleEditKeydown(event, ${todo.id})` : ''}"
                >${todo.text.replace(/\n/g, '<br>')}</div>
                
                <div class="todo-actions">
                    <button class="action-btn edit-btn" onclick="todoApp.startEdit(${todo.id})">✏️</button>
                    <button class="action-btn delete-btn" onclick="todoApp.deleteTodo(${todo.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    render() {
        this.updateStats();
        this.renderTodos();
        
        // Show/hide clear all button
        const clearBtn = document.getElementById('clearAllBtn');
        clearBtn.style.display = this.todos.length > 0 ? 'block' : 'none';
    }

    save() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.todoApp = new TodoApp();
});