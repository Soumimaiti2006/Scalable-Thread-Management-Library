/**
 * HPC Thread Management Console - Integrated Logic
 */

const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://scalable-thread-management-backend.onrender.com"; // PLACEHOLDER: Replace with your actual Render URL
let taskQueue = [];
let runningTasks = [];
let completedTasks = [];
let selectedPriority = 2; // Default: NORM

let pollInterval = null;
const POLL_RATE = 500; 

/**
 * Priority UI Handling
 */
function setPriority(p) {
    selectedPriority = p;
    document.querySelectorAll('.p-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.p) === p);
    });
}

const PRIORITY_MAP = {
    0: { label: 'CRIT', class: 'badge-crit' },
    1: { label: 'HIGH', class: 'badge-high' },
    2: { label: 'NORM', class: 'badge-norm' },
    3: { label: 'LOW', class: 'badge-low' }
};

/**
 * Task Deployment
 */
async function addTask() {
    const input = document.getElementById("taskInput");
    const taskName = input.value.trim();
    if (!taskName) return;

    const newTask = {
        id: `task-${Date.now()}`,
        name: taskName,
        duration: Math.floor(Math.random() * 3000) + 1500,
        priority: selectedPriority
    };

    try {
        await fetch(`${API_BASE}/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTask)
        });
        input.value = "";
        fetchStatus();
    } catch (e) { console.error("Communication Failure", e); }
}

/**
 * Core Orchestration
 */
async function startSimulation() {
    try {
        await fetch(`${API_BASE}/start`);
        if (!pollInterval) {
            pollInterval = setInterval(fetchStatus, POLL_RATE);
            startLocalInterpolation();
        }
    } catch (e) { console.error("Execution Error", e); }
}

async function updateConcurrency(value) {
    document.getElementById("concurrencyValue").innerText = value;
    try {
        await fetch(`${API_BASE}/config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ max_workers: parseInt(value) })
        });
    } catch (e) { console.error("Tuning Failed", e); }
}

async function cancelTask(taskId) {
    try {
        await fetch(`${API_BASE}/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: taskId })
        });
        await fetchStatus();
    } catch (e) { console.error("Purge Error", e); }
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
    } catch (e) { console.error("Sync Failure", e); }
}

function updateMetricsUI(metrics) {
    document.getElementById("throughput").innerText = metrics.throughput;
    document.getElementById("latency").innerText = `${metrics.avg_latency}s`;
    
    const loadPercent = Math.round(metrics.system_load * 100);
    document.getElementById("loadBar").style.width = `${loadPercent}%`;
    document.getElementById("loadText").innerText = `${loadPercent}% SYSTEM LOAD`;
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
    syncTaskList("queue", taskQueue, false, true);
    syncTaskList("running", runningTasks, true, true);
    syncTaskList("completed", completedTasks, false, false);
}

function syncTaskList(containerId, tasks, showProgress = false, showCancel = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const taskIds = new Set(tasks.map(t => t.id));

    Array.from(container.querySelectorAll('.task-card')).forEach(node => {
        if (!taskIds.has(node.dataset.id)) {
            node.style.opacity = '0';
            node.style.transform = 'scale(0.9) translateY(10px)';
            setTimeout(() => node.remove(), 500);
        }
    });

    tasks.forEach(task => {
        let node = container.querySelector(`.task-card[data-id="${task.id}"]`);
        const pMeta = PRIORITY_MAP[task.priority] || PRIORITY_MAP[2];
        
        if (!node) {
            node = document.createElement('div');
            node.className = 'task-card';
            node.dataset.id = task.id;
            node.innerHTML = `
                <div class="task-row">
                    <div class="task-info">
                        <span class="p-badge ${pMeta.class}">${pMeta.label}</span>
                        <span class="task-title">${task.name}</span>
                    </div>
                    <div class="task-actions">
                        <span class="task-meta-val"></span>
                        ${showCancel ? `<button class="task-cancel" onclick="cancelTask('${task.id}')">✕</button>` : ""}
                    </div>
                </div>
                <div class="task-progress-wrap">
                    <div class="task-bar-bg"><div class="task-bar-fill" style="width: 0%"></div></div>
                    <div class="task-meta">INIT_STATE</div>
                </div>
            `;
            container.appendChild(node);
        }

        if (showProgress) {
            node.querySelector('.task-progress-wrap').style.display = 'block';
            node.querySelector('.task-bar-fill').style.width = `${task.progress}%`;
            node.querySelector('.task-meta').innerText = `${Math.round(task.progress)}%_STABLE`;
            node.querySelector('.task-meta-val').innerText = `EXECUTING`;
        } else {
            node.querySelector('.task-progress-wrap').style.display = 'none';
            node.querySelector('.task-meta-val').innerText = containerId === 'completed' ? 'PASS' : 'WAIT';
        }
    });
}