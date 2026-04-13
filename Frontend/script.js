/**
 * Thread Management Visualizer - HPC Integration
 */

const API_BASE = "http://localhost:5000";
let taskQueue = [];
let runningTasks = [];
let completedTasks = [];

let pollInterval = null;
const POLL_RATE = 500; 

async function addTask() {
    const input = document.getElementById("taskInput");
    const taskName = input.value.trim();
    if (!taskName) return;

    const newTask = {
        id: `task-${Date.now()}`,
        name: taskName,
        duration: Math.floor(Math.random() * 3000) + 1500
    };

    try {
        await fetch(`${API_BASE}/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTask)
        });
        input.value = "";
        fetchStatus();
    } catch (e) { console.error("Network Error", e); }
}

/**
 * Commands the backend to terminate a specific thread/task.
 */
async function cancelTask(taskId) {
    try {
        await fetch(`${API_BASE}/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: taskId })
        });
        await fetchStatus();
    } catch (e) { console.error("Cancel Error", e); }
}

async function updateConcurrency(value) {
    document.getElementById("concurrencyValue").innerText = value;
    try {
        await fetch(`${API_BASE}/config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ max_workers: parseInt(value) })
        });
    } catch (e) { console.error("Config Error", e); }
}

async function startSimulation() {
    try {
        await fetch(`${API_BASE}/start`);
        if (!pollInterval) {
            pollInterval = setInterval(fetchStatus, POLL_RATE);
            startLocalInterpolation();
        }
    } catch (e) { console.error("Start Error", e); }
}

async function fetchStatus() {
    try {
        const res = await fetch(`${API_BASE}/status`);
        const data = await res.json();
        taskQueue = data.queue;
        completedTasks = data.completed;
        syncRunningState(data.running);
        updateMetricsUI(data.metrics);
        updateUI();
    } catch (e) { console.error("Status Error", e); }
}

function updateMetricsUI(metrics) {
    document.getElementById("throughput").innerText = metrics.throughput;
    document.getElementById("latency").innerText = `${metrics.avg_latency}s`;
    const loadPercent = Math.round(metrics.system_load * 100);
    document.getElementById("loadBar").style.width = `${loadPercent}%`;
    document.getElementById("loadText").innerText = `${loadPercent}%`;
}

function syncRunningState(newRunningTasks) {
    runningTasks = newRunningTasks.map(task => {
        const existing = runningTasks.find(t => t.id === task.id);
        return {
            ...task,
            startTime: existing ? existing.startTime : Date.now(),
            progress: existing ? existing.progress : 0
        };
    });
}

function startLocalInterpolation() {
    const loop = () => {
        if (!pollInterval) return;
        runningTasks.forEach(t => {
            const elapsed = Date.now() - t.startTime;
            t.progress = Math.min(99, (elapsed / t.duration) * 100);
        });
        updateUI();
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
}

async function resetAll() {
    await fetch(`${API_BASE}/reset`, { method: "POST" });
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    taskQueue = []; runningTasks = []; completedTasks = [];
    updateUI();
    updateMetricsUI({ throughput: 0, avg_latency: 0, system_load: 0, concurrency: 3 });
}

function updateUI() {
    syncTaskList("queue", taskQueue, false, true); // show cancel
    syncTaskList("running", runningTasks, true, true); // show cancel
    syncTaskList("completed", completedTasks, false, false);
    document.getElementById("total").innerText = taskQueue.length + runningTasks.length + completedTasks.length;
}

function syncTaskList(containerId, tasks, showProgress = false, showCancel = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const taskIds = new Set(tasks.map(t => t.id));

    Array.from(container.querySelectorAll('.task-item')).forEach(node => {
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
                    <div class="task-actions">
                        <span class="task-percent"></span>
                        ${showCancel ? `<button class="btn-cancel" onclick="cancelTask('${task.id}')">✕</button>` : ""}
                    </div>
                </div>
                <div class="progress-container"><div class="progress-bar"></div></div>
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