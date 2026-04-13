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
task_history = []
cancelled_ids = set() # Track tasks to be terminated early

lock = threading.Lock()
MAX_WORKERS = 3
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

def worker(task):
    """
    Simulated thread task with Cooperative Cancellation.
    """
    start_time = time.time()
    task_id = task["id"]
    
    # We check for cancellation in a loop to simulate "Early Termination"
    # A real High-Performance library uses this 'check-flag' pattern.
    duration_sec = task["duration"] / 1000
    intervals = 10
    step = duration_sec / intervals
    
    for _ in range(intervals):
        if task_id in cancelled_ids:
            with lock:
                if task in running:
                    running.remove(task)
            return # Terminate early
        time.sleep(step)

    with lock:
        if task in running:
            running.remove(task)
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

@app.route('/cancel', methods=['POST'])
def cancel_task():
    """
    Supports termination of both queued and running threads.
    """
    global tasks, running
    task_id = request.json.get("id")
    if not task_id:
        return jsonify({"error": "ID required"}), 400

    with lock:
        # 1. Remove from Queue if present
        tasks = [t for t in tasks if t["id"] != task_id]
        # 2. Mark for early termination if running
        cancelled_ids.add(task_id)
        
    return jsonify({"status": "cancelled", "id": task_id})

@app.route('/start', methods=['GET'])
@app.route('/status', methods=['GET', 'POST'])
def status_and_scheduler():
    with lock:
        while tasks and len(running) < MAX_WORKERS:
            task = tasks.pop(0)
            running.append(task)
            executor.submit(worker, task)

    return get_status_payload()

@app.route('/config', methods=['POST'])
def update_config():
    global MAX_WORKERS, executor
    data = request.json
    new_limit = data.get("max_workers")
    if new_limit and 1 <= new_limit <= 50:
        with lock:
            MAX_WORKERS = new_limit
            executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
        return jsonify({"status": "updated", "max_workers": MAX_WORKERS})
    return jsonify({"error": "Invalid limit"}), 400

@app.route('/reset', methods=['POST'])
def reset():
    global tasks, running, completed, task_history, cancelled_ids, executor
    with lock:
        tasks = []
        running = []
        completed = []
        task_history = []
        cancelled_ids = set()
        executor.shutdown(wait=False)
        executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
    return jsonify({"status": "reset"})

def get_status_payload():
    now = time.time()
    recent_tasks = [t for t in task_history if now - t["finished_at"] < 60]
    throughput = len(recent_tasks)
    avg_latency = round(sum(t["latency"] for t in recent_tasks) / len(recent_tasks), 2) if recent_tasks else 0

    return jsonify({
        "queue": tasks,
        "running": running,
        "completed": completed,
        "metrics": {
            "throughput": throughput,
            "avg_latency": avg_latency,
            "concurrency": MAX_WORKERS,
            "system_load": len(running) / MAX_WORKERS if MAX_WORKERS > 0 else 0
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
