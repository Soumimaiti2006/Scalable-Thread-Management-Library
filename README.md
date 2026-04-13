# Scalable Thread Management Library (HPC Edition)

![HPC Visualizer](https://img.shields.io/badge/Architecture-Managed_Thread_Pool-58a6ff)
![Backend](https://img.shields.io/badge/Backend-Python_Flask-3fb950)
![Frontend](https://img.shields.io/badge/Frontend-Modern_JS_/_CSS-bc8cff)

A high-performance thread management library designed for efficient task orchestration, real-time synchronization, and granular termination. This project provides a robust framework for handling thousands of concurrent tasks through a managed pool architecture, visualized through a premium desktop-grade dashboard.

## 🚀 Core Features

- **Managed Thread Pool**: Efficiently processes thousands of tasks using a controlled set of physical worker threads via `concurrent.futures`.
- **Dynamic Concurrency Tuning**: Real-time adjustment of the thread pool size directly from the UI to match system load.
- **Advanced Synchronization**: Thread-safe operations using `threading.Lock` and atomic state synchronization between backend and frontend.
- **Granular Termination**: Supports individual task cancellation (Queue/Running) and global library resets.
- **Real-time HPC Metrics**:
  - **Throughput (TPM)**: Tracks successfully completed tasks per minute.
  - **Avg. Latency**: Measures the average processing time per task.
  - **System Load**: Visualizes worker thread occupancy.

## 🛠️ Tech Stack

- **Backend**: Python 3.x, Flask, Flask-CORS.
- **Frontend**: Vanilla JavaScript (ES6+), Modern CSS3 (Glassmorphism), Google Fonts (Inter/Outfit).
- **Communication**: RESTful API with local polling and client-side interpolation for smooth UI.

## 🏁 Getting Started

### 1. Install Dependencies
```bash
pip install flask flask-cors
```

### 2. Start the Backend
```bash
cd Backend
python app.py
```

### 3. Launch the Frontend
Simply open `Frontend/index.html` in any modern web browser.

## 📈 Architecture

The library follows a **Producer-Consumer** pattern:
1. **Producer**: Tasks are added to the library via the `/add` endpoint.
2. **Orchestrator**: A dedicated scheduler monitors the queue and dispatches tasks to the **Managed Thread Pool**.
3. **Consumers**: Worker threads execute the simulation and update state flags.
4. **Observer**: The frontend polls the `/status` endpoint and uses a high-frequency interpolation engine (50ms) to ensure fluid visual feedback.

---
*Targeted for High-Performance Computing (HPC) environments where resource efficiency and real-time monitoring are critical.*
