/**
 * Thread Management Visualizer - Core Logic
 * Handles task queuing, execution simulation, and UI synchronization.
 */

let taskQueue = [];
let runningTasks = [];
let completedTasks = [];

let simulationInterval = null;
const MAX_THREADS = 3;
const TICK_RATE = 50; // ms between updates

/**
 * Adds a new task to the waiting queue.
 */
function addTask() {
    const input = document.getElementById("taskInput");
    const taskName = input.value.trim();

    if (!taskName) return;

    const newTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: taskName,
        progress: 0,
        duration: Math.floor(Math.random() * 3000) + 2000, // 2-5 seconds
        startTime: null
    };

    taskQueue.push(newTask);
    input.value = "";
    updateUI();
}

/**
 * Starts the simulation loop.
 */
function startSimulation() {
    if (simulationInterval) return;

    simulationInterval = setInterval(() => {
        while (runningTasks.length < MAX_THREADS && taskQueue.length > 0) {
            const task = taskQueue.shift();
            task.startTime = Date.now();
            runningTasks.push(task);
        }

        runningTasks.forEach(task => {
            const elapsed = Date.now() - task.startTime;
            task.progress = Math.min(100, (elapsed / task.duration) * 100);
        });

        const finished = runningTasks.filter(t => t.progress >= 100);
        finished.forEach(task => {
            runningTasks = runningTasks.filter(t => t.id !== task.id);
            completedTasks.push(task);
        });

        updateUI();

        if (taskQueue.length === 0 && runningTasks.length === 0) {
            stopSimulation();
        }
    }, TICK_RATE);
}

function stopSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
}

function resetAll() {
    stopSimulation();
    taskQueue = [];
    runningTasks = [];
    completedTasks = [];
    
    // Clear the DOM lists manually for a clean slate
    ["queue", "running", "completed"].forEach(id => {
        document.getElementById(id).innerHTML = "";
    });
    
    updateUI();
}

/**
 * Renders the state to the DOM using persistent nodes.
 */
function updateUI() {
    syncTaskList("queue", taskQueue);
    syncTaskList("running", runningTasks, true);
    syncTaskList("completed", completedTasks);

    document.getElementById("total").innerText = 
        taskQueue.length + runningTasks.length + completedTasks.length;
    
    document.getElementById("done").innerText = completedTasks.length;
}

/**
 * Synchronizes the DOM list with the task array without overwriting existing nodes.
 */
function syncTaskList(containerId, tasks, showProgress = false) {
    const container = document.getElementById(containerId);
    const existingNodes = Array.from(container.querySelectorAll('.task-item'));
    const taskIds = new Set(tasks.map(t => t.id));

    // 1. Remove orphaned nodes
    existingNodes.forEach(node => {
        if (!taskIds.has(node.dataset.id)) {
            node.remove();
        }
    });

    // 2. Add or Update nodes
    tasks.forEach((task, index) => {
        let node = container.querySelector(`.task-item[data-id="${task.id}"]`);
        
        if (!node) {
            // Create new node if it doesn't exist
            node = document.createElement('div');
            node.className = 'task-item';
            node.dataset.id = task.id;
            node.innerHTML = `
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <span class="task-percent"></span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar"></div>
                </div>
            `;
            
            // Handle initial state for progress bars
            if (!showProgress) {
                node.querySelector('.progress-container').style.display = 'none';
            }

            // Append in correct order (or just append if index management is too complex for this demo)
            container.appendChild(node);
        }

        // 3. Update Existing Node
        if (showProgress) {
            node.querySelector('.progress-container').style.display = 'block';
            node.querySelector('.progress-bar').style.width = `${task.progress}%`;
            node.querySelector('.task-percent').innerText = `${Math.round(task.progress)}%`;
            node.classList.add('is-running');
        } else {
            node.querySelector('.progress-container').style.display = 'none';
            node.querySelector('.task-percent').innerText = '';
            node.classList.remove('is-running');
        }
    });
}