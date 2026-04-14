import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from manager import ThreadManager

app = Flask(__name__)
CORS(app)

# Initialize the library
manager = ThreadManager(max_workers=3)

@app.route('/health', methods=['GET'])
def health():
    """Keep-alive endpoint for cron-job.org"""
    return jsonify({"status": "active", "timestamp": os.getlogin() if hasattr(os, 'getlogin') else "server"}), 200

@app.route('/add', methods=['POST'])
def add_task():
    data = request.json
    if not data or "id" not in data or "name" not in data:
        return jsonify({"error": "Invalid data"}), 400

    # Capture priority (default 2: Normal)
    priority = int(data.get("priority", 2))
    task = manager.add_task(
        task_id=data["id"],
        name=data["name"],
        duration=data.get("duration", 2000),
        priority=priority
    )
    
    return jsonify({"status": "added", "task": task})

@app.route('/cancel', methods=['POST'])
def cancel_task():
    task_id = request.json.get("id")
    if not task_id:
        return jsonify({"error": "ID required"}), 400

    manager.cancel_task(task_id)
    return jsonify({"status": "cancelled", "id": task_id})

@app.route('/start', methods=['GET'])
def start():
    manager.start_orchestration()
    return jsonify(manager.get_status())

@app.route('/status', methods=['GET', 'POST'])
def status():
    # The orchestrator automatically dispatches tasks if space is available
    manager.start_orchestration()
    return jsonify(manager.get_status())

@app.route('/config', methods=['POST'])
def update_config():
    data = request.json
    new_limit = data.get("max_workers")
    if new_limit:
        if manager.update_config(int(new_limit)):
            return jsonify({"status": "updated", "max_workers": new_limit})
    return jsonify({"error": "Invalid limit"}), 400

@app.route('/reset', methods=['POST'])
def reset():
    manager.reset()
    return jsonify({"status": "reset"})

if __name__ == '__main__':
    # Launch the API
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
