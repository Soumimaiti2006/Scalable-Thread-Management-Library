from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import time
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)
CORS(app)

# Global task state & Metrics
tasks = []
running = []
completed = []
task_history = [] # For throughput calculation

lock = threading.Lock()
# Performance Tuning
MAX_WORKERS = 3
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

def worker(task):
    """
    Simulated thread task with metrics recording.
    """
    start_time = time.time()
    
    # Simulation logic
    time.sleep(task["duration"] / 1000)

    with lock:
        if task in running:
            running.remove(task)
            # Add metadata for performance tracking
            task["finished_at"] = time.time()
            task["latency"] = task["finished_at"] - start_time
            completed.append(task)
            task_history.append(task)

@app.route('/add', methods=['POST'])
def add_task():
    data = request.json
    if not data or "id" not in data or "name" not in data:
        return jsonify({"error": "Invalid data"}), 400

    task = {
        "id": data["id"],
        "name": data["name"],
        "duration": data.get("duration", 2000),
        "created_at": time.time()
    }

    with lock:
        tasks.append(task)
    
    return jsonify({"status": "added", "task": task})

@app.route('/start', methods=['GET'])
def start():
    """
    Orchestrates the ThreadPool transition.
    """
    global tasks, executor
    
    with lock:
        # High-Performance approach: Submit as many tasks as possible to the pool
        # The executor handles the queuing automatically if pool is full.
        while tasks and len(running) < MAX_WORKERS:
            task = tasks.pop(0)
            running.append(task)
            executor.submit(worker, task)

    return get_status_payload()

@app.route('/status', methods=['GET', 'POST'])
def status():
    # If tasks are waiting in the internal executor queue but we have space,
    # pull them out. For this visualizer, we control the orchestrator.
    with lock:
        # Auto-scheduler: if we have free threads and waiting tasks, start them
        while tasks and len(running) < MAX_WORKERS:
            task = tasks.pop(0)
            running.append(task)
            executor.submit(worker, task)

    return get_status_payload()

@app.route('/config', methods=['POST'])
def update_config():
    """
    Dynamically adjusts pool size (Scalability feature).
    """
    global MAX_WORKERS, executor
    data = request.json
    new_limit = data.get("max_workers")
    
    if new_limit and 1 <= new_limit <= 50:
        with lock:
            MAX_WORKERS = new_limit
            # We rebuild the executor to change worker count (standard practice in Python futures)
            # Existing tasks will continue to finish on the old pool's threads.
            executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
        return jsonify({"status": "updated", "max_workers": MAX_WORKERS})
    
    return jsonify({"error": "Invalid limit"}), 400

@app.route('/reset', methods=['POST'])
def reset():
    global tasks, running, completed, task_history, executor
    with lock:
        tasks = []
        running = []
        completed = []
        task_history = []
        executor.shutdown(wait=False)
        executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
    return jsonify({"status": "reset"})

def get_status_payload():
    """
    Calculates real-time performance metrics.
    """
    now = time.time()
    # Throuput: tasks per minute (calculated over last 60 seconds)
    recent_tasks = [t for t in task_history if now - t["finished_at"] < 60]
    throughput = len(recent_tasks) 
    
    avg_latency = 0
    if recent_tasks:
        avg_latency = sum(t["latency"] for t in recent_tasks) / len(recent_tasks)

    return jsonify({
        "queue": tasks,
        "running": running,
        "completed": completed,
        "metrics": {
            "throughput": throughput,
            "avg_latency": round(avg_latency, 2),
            "concurrency": MAX_WORKERS,
            "system_load": len(running) / MAX_WORKERS if MAX_WORKERS > 0 else 0
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
