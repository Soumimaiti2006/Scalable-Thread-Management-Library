from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import time

app = Flask(__name__)
# Enable CORS for all routes (important for frontend communication)
CORS(app)

# Global task state
tasks = []
running = []
completed = []

lock = threading.Lock()
MAX_THREADS = 3

def worker(task):
    """
    Simulation of a thread performing a task.
    """
    # Duration is in ms, sleep expects seconds
    time.sleep(task["duration"] / 1000)

    with lock:
        # Move from running to completed
        if task in running:
            running.remove(task)
            completed.append(task)

@app.route('/add', methods=['POST'])
def add_task():
    data = request.json
    
    # Validate required fields
    if not data or "id" not in data or "name" not in data:
        return jsonify({"error": "Invalid task data"}), 400

    task = {
        "id": data["id"],
        "name": data["name"],
        "duration": data.get("duration", 2000) # Default 2s if not provided
    }

    with lock:
        tasks.append(task)
    
    return jsonify({"status": "added", "task": task})

@app.route('/start', methods=['GET'])
def start():
    global tasks
    
    with lock:
        # Move tasks from queue to running based on thread availability
        while tasks and len(running) < MAX_THREADS:
            task = tasks.pop(0)
            running.append(task)
            # Start the background thread
            thread = threading.Thread(target=worker, args=(task,))
            thread.daemon = True # Ensure threads don't block app shutdown
            thread.start()

    return jsonify({
        "queue": tasks,
        "running": running,
        "completed": completed
    })

@app.route('/status', methods=['GET'])
def status():
    """
    Returns the current state of all tasks for synchronization.
    """
    with lock:
        return jsonify({
            "queue": tasks,
            "running": running,
            "completed": completed
        })

@app.route('/reset', methods=['POST'])
def reset():
    """
    Clears all server-side state.
    """
    global tasks, running, completed
    with lock:
        tasks = []
        running = []
        completed = []
    return jsonify({"status": "reset"})

if __name__ == '__main__':
    # Running on port 5000 by default
    app.run(debug=True, port=5000)
