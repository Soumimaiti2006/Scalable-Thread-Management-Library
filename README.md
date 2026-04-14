# 🌌 Scalable Thread Management Library (HPC Edition)

![Architecture](https://img.shields.io/badge/Architecture-Managed_Thread_Pool-00d2ff)
![Scheduling](https://img.shields.io/badge/Scheduling-Priority_Aware_Min_Heap-9d50bb)
![Backend](https://img.shields.io/badge/Backend-Python_Flask-3fb950)
![Status](https://img.shields.io/badge/Status-Project_Completed-00ff88)

An ultra-premium, industrial-grade thread management toolkit designed for High-Performance Computing (HPC). This library provides sophisticated task orchestration, real-time telemetry, and dynamic concurrency tuning behind a stunning Glassmorphism 2.0 dashboard.

---

## 🚀 Key Capabilities

- **Priority-Aware Orchestration**: Implements a weighted **Min-Heap** scheduler. Tasks with higher criticality (lower numeric value) bypass the standard queue.
- **Managed Thread Pool**: Built on `concurrent.futures`, optimized for handling thousands of concurrent task requests with zero thread starvation.
- **Cooperative Task Termination**: Supports granular, mid-execution cancellation of specific tasks through iterative state checks.
- **HPC Metrics Bento**: Real-time computation of **Throughput (Tasks/Min)**, **Latency (ms)**, and **System Load %**.
- **Dynamic Tuning**: Adjust the global concurrency limit (1–50 workers) on-the-fly without restarting the orchestration engine.

---

## 🛠️ Tech Stack

- **Core**: Python 3.x
- **Library Engine**: `ThreadPoolExecutor`, `heapq`, `threading.Lock`
- **Interface Layer**: Flask / Flask-CORS
- **Console Frontend**: Vanilla HTML5 / CSS3 (Glassmorphism 2.0) / Javascript ES6+

---

## 📡 API Reference

The library exposes a high-performance REST API on port `5000`.

### 1. Initialize Task
`POST /add`
| Payload | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Unique tracking identifier |
| `name` | String | Human-readable task name |
| `duration` | Int | Simulated workload duration (ms) |
| `priority`| Int | `0: CRIT`, `1: HIGH`, `2: NORM`, `3: LOW` |

### 2. Control Engine
- `GET /start`: Begins processing tasks from the priority heap.
- `POST /cancel`: `{"id": "task-123"}` — Marks a task for immediate cooperative termination.
- `POST /config`: `{"max_workers": 10}` — Updates concurrency limits.
- `POST /reset`: Wipes all state, purges the queue, and resets metrics.

### 3. Monitoring
- `GET /status`: Returns the full system state, including `queue`, `running`, `completed` lists, and health metrics.

---

## 📐 System Architecture

1.  **Orchestrator (`manager.py`)**: The brain of the library. It manages the Priority Queue, locks state for thread safety, and dispatches workers to the secondary `ThreadPoolExecutor`.
2.  **API Gateway (`app.py`)**: Facilitates communication between external consumers (like the UI) and the Orchestrator.
3.  **HPC Console (`Frontend/`)**: A real-time visualizer that uses **Local Interpolation** to provide smooth 60fps progress tracking between server sync intervals.

---

## 🚦 Priority Schema

| Level | Label | Value | Description |
| :--- | :--- | :--- | :--- |
| **0** | **CRITICAL** | `0` | Immediate bypass. Processed before all other tasks. |
| **1** | **HIGH** | `1` | Priority processing for heavy workloads. |
| **2** | **NORMAL** | `2`| Standard background processing. |
| **3** | **LOW** | `3` | Background utility tasks (Fill-only). |

---

## 🏁 Setup & Deployment

1.  **Prepare Environment**:
    ```bash
    pip install flask flask-cors
    ```
2.  **Launch Core**:
    ```bash
    python Backend/app.py
    ```
3.  **Access Dashboard**:
    Simply open `Frontend/index.html` in any modern web browser.

---
*Optimized for mission-critical task orchestration in high-density computing environments.*
