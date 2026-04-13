/**
 * Thread Management Visualizer - Backend Integrated Logic
 * Handles real-time synchronization with the Python Flask server.
 */

const API_BASE = "http://localhost:5000";
let taskQueue = [];
let runningTasks = [];
let completedTasks = [];

let pollInterval = null;
const POLL_RATE = 500; // ms between server state fetches
const ANIMATION_RATE = 50; // ms for local progress bar interpolation

/**
 * Adds a new task by sending it to the Python backend.
 */
async function addTask() {
    const input = document.getElementById("taskInput");
    const taskName = input.value.trim();

    if (!taskName) return;

    const newTask = {
        id: `task-${Date.now()}`,
        name: taskName,
        duration: Math.floor(Math.random() * 3000) + 2000 // 2-5s
    };

    try {
        const response = await fetch(`${API_BASE}/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTask)
        });

        if (response.ok) {
            input.value = "";
            await fetchStatus(); // Refresh immediately
        }
    } catch (error) {
        console.error("Failed to add task:", error);
        alert("Backend server is not reachable. Is it running?");
    }
}

/**
 * Commands the backend to start processing threads and begins polling.
 */
async function startSimulation() {
    try {
        await fetch(`${API_BASE}/start`);
        
        if (!pollInterval) {
            pollInterval = setInterval(fetchStatus, POLL_RATE);
            // Start the local interpolation loop for smooth progress bars
            startLocalInterpolation();
        }
    } catch (error) {
        console.error("Failed to start simulation:", error);
    }
}

/**
 * Fetches the current state of all tasks from the server.
 */
async function fetchStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();

        // Update local state arrays
        taskQueue = data.queue;
        completedTasks = data.completed;

        // Sync running tasks while preserving local interpolation start times
        syncRunningState(data.running);
        
        updateUI();
    } catch (error) {
        console.error("Polling error:", error);
    }
}

/**
 * Preserves local start times for running tasks to keep animations smooth.
 */
function syncRunningState(newRunningTasks) {
    const freshRunning = newRunningTasks.map(task => {
        const existing = runningTasks.find(t => t.id === task.id);
        return {
            ...task,
            // If already running, keep the local startTime, else mark as just started
            startTime: existing ? existing.startTime : Date.now(),
            progress: existing ? existing.progress : 0
        };
    });

    runningTasks = freshRunning;
}

/**
 * Smoothly interpolates progress bars on the client side between server polls.
 */
function startLocalInterpolation() {
    const loop = () => {
        if (!pollInterval) return;

        runningTasks.forEach(task => {
            const elapsed = Date.now() - task.startTime;
            task.progress = Math.min(99, (elapsed / task.duration) * 100); // Max 99% until server confirms completion
        });

        updateUI();
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
}

/**
 * Resets both server and client state.
 */
async function resetAll() {
    try {
        await fetch(`${API_BASE}/reset`, { method: "POST" });
        
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }

        taskQueue = [];
        runningTasks = [];
        completedTasks = [];

        // Clear the DOM lists
        ["queue", "running", "completed"].forEach(id => {
            document.getElementById(id).innerHTML = "";
        });

        updateUI();
    } catch (error) {
        console.error("Failed to reset:", error);
    }
}

/**
 * Rendering Logic (Smart DOM Syncing)
 */
function updateUI() {
    syncTaskList("queue", taskQueue);
    syncTaskList("running", runningTasks, true);
    syncTaskList("completed", completedTasks);

    document.getElementById("total").innerText = 
        taskQueue.length + runningTasks.length + completedTasks.length;
    
    document.getElementById("done").innerText = completedTasks.length;
}

function syncTaskList(containerId, tasks, showProgress = false) {
    const container = document.getElementById(containerId);
    const existingNodes = Array.from(container.querySelectorAll('.task-item'));
    const taskIds = new Set(tasks.map(t => t.id));

    existingNodes.forEach(node => {
        if (!taskIds.has(node.dataset.id)) node.remove();
    });

    tasks.forEach(task => {
        let node = container.querySelector(`.task-item[data-id="${task.id}"]`);
        
        if (!node) {
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
            container.appendChild(node);
        }

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