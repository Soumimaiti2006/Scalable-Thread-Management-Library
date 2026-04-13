import threading
import time
import heapq
from concurrent.futures import ThreadPoolExecutor

class ThreadManager:
    """
    A scalable, priority-aware thread management library.
    Handles task orchestration, metrics tracking, and individual task termination.
    """
    
    def __init__(self, max_workers=3):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        
        # State tracking
        self.queue = [] # Min-heap for priority: (priority_level, timestamp, task_dict)
        self.running = []
        self.completed = []
        self.cancelled_ids = set()
        self.task_history = []
        
        self.lock = threading.Lock()
        
    def add_task(self, task_id, name, duration, priority=2):
        """
        Adds a task to the library's priority queue.
        """
        task = {
            "id": task_id,
            "name": name,
            "duration": duration,
            "priority": priority,
            "created_at": time.time()
        }
        
        with self.lock:
            # We use (priority, timestamp) to ensure FIFO for same priority levels
            heapq.heappush(self.queue, (priority, task["created_at"], task))
            
        return task

    def start_orchestration(self):
        """
        Pulls tasks from the priority queue and dispatches them to worker threads.
        """
        with self.lock:
            while self.queue and len(self.running) < self.max_workers:
                _, _, task = heapq.heappop(self.queue)
                self.running.append(task)
                self.executor.submit(self._worker, task)

    def _worker(self, task):
        """
        Internal worker function with cooperative cancellation.
        """
        start_time = time.time()
        task_id = task["id"]
        
        # Simulated workload with cancellation checks
        duration_sec = task["duration"] / 1000
        intervals = 10
        step = duration_sec / intervals
        
        for _ in range(intervals):
            if task_id in self.cancelled_ids:
                with self.lock:
                    if task in self.running:
                        self.running.remove(task)
                return
            time.sleep(step)

        with self.lock:
            if task in self.running:
                self.running.remove(task)
                task["finished_at"] = time.time()
                task["latency"] = task["finished_at"] - start_time
                self.completed.append(task)
                self.task_history.append(task)

    def cancel_task(self, task_id):
        """
        Cancels a task if it's in the queue or marks it for termination if running.
        """
        with self.lock:
            # 1. Remove from Queue (since it's a heap, we rebuild it)
            initial_count = len(self.queue)
            self.queue = [item for item in self.queue if item[2]["id"] != task_id]
            if len(self.queue) != initial_count:
                heapq.heapify(self.queue)
                
            # 2. Mark for running termination
            self.cancelled_ids.add(task_id)

    def update_config(self, max_workers):
        """
        Dynamically adjusts the concurrency limit.
        """
        with self.lock:
            if 1 <= max_workers <= 50:
                self.max_workers = max_workers
                self.executor = ThreadPoolExecutor(max_workers=max_workers)
                return True
        return False

    def reset(self):
        """
        Resets the entire library state.
        """
        with self.lock:
            self.queue = []
            self.running = []
            self.completed = []
            self.task_history = []
            self.cancelled_ids = set()
            self.executor.shutdown(wait=False)
            self.executor = ThreadPoolExecutor(max_workers=self.max_workers)

    def get_status(self):
        """
        Calculates and returns the library's current health and performance metrics.
        """
        with self.lock:
            now = time.time()
            # Throughput: tasks per minute
            recent_tasks = [t for t in self.task_history if now - t["finished_at"] < 60]
            throughput = len(recent_tasks)
            
            avg_latency = round(sum(t["latency"] for t in recent_tasks) / len(recent_tasks), 2) if recent_tasks else 0
            
            # Map heap back to a simple list for JSON serialization
            queue_list = [item[2] for item in sorted(self.queue)]

            return {
                "queue": queue_list,
                "running": self.running,
                "completed": self.completed,
                "metrics": {
                    "throughput": throughput,
                    "avg_latency": avg_latency,
                    "concurrency": self.max_workers,
                    "system_load": len(self.running) / self.max_workers if self.max_workers > 0 else 0
                }
            }
