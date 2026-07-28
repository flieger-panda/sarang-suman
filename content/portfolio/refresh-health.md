# Real-Time BLE Presence Detection System

**Refresh Health**, Software Engineering Intern
June 2026 – Present | Atlanta, GA

**Stack:** ESP32, ESPresense, MQTT (Mosquitto), FastAPI, PostgreSQL, React, Tailscale

I architected and built a real-time presence detection system from the ground up for this early-stage health-tech startup, designed to track device presence across a distributed sensor network with sub-500ms detection latency.

The system integrates ESP32 nodes running ESPresense firmware to detect BLE signals, which stream events through a Mosquitto MQTT broker into a FastAPI backend. I designed the PostgreSQL schema for presence event persistence and implemented node health monitoring to track sensor uptime across the deployment. I also built a React dashboard so the team could see live device presence and status without querying the database directly.

Beyond the core pipeline, I owned the system's networking and deployment architecture. I set up a Tailscale-based tailnet to enable secure connectivity across distributed devices, evaluated infrastructure and deployment options, and presented recommendations directly to engineering leadership, taking the project from an architectural concept through to a working, observable production system. This infrastructure work is laying the foundation for the company's broader expansion into additional IoT features.
