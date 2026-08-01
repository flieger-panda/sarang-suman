---
date: present
description: A distributed, edge-to-cloud presence-detection system built from
  scratch for a health-tech startup: ESP32/ESPresense edge sensors over MQTT
  into a FastAPI/PostgreSQL backend, wired into the EHR.
keywords: ESP32, ESPresense, MQTT, Mosquitto, FastAPI, PostgreSQL, React, Tailscale,
  IoT, BLE, presence detection, distributed systems, edge computing, healthcare
  software, software engineering intern
---
# Refresh Health: IoT Platform for Healthcare Cloud Software

## Overview

**Refresh Health**, Software Engineering Intern
June 2026 – Present | Atlanta, GA

**Stack:** ESP32, ESPresense, MQTT (Mosquitto), FastAPI, PostgreSQL, React, Tailscale

## What I Did

I architected and built a distributed, edge-to-cloud presence-detection system from the ground up for an early-stage health-tech startup. The system is built a fleet of edge brokers reporting into a centralized backend, piloting functionality by tracking device presence across the network.

At the edge, ESP32 nodes running open-source firmware detect BLE signals and stream events through a Mosquitto MQTT broker into a FastAPI backend that aggregates and reconciles state across the whole distributed sensor network. I designed the PostgreSQL schema for presence event persistence and implemented node health monitoring to track sensor uptime fleet-wide. I also built a React dashboard for internal visibility into live device presence and status, but the real target for this data was clinical, not administrative: I integrated presence-driven prompting directly into the EHR's UI, surfacing contextual prompts to clinicians based on real-time presence signals propagating up from the edge — the end goal the whole detection pipeline was built to serve.

Beyond the core pipeline, I owned the system's distributed networking and deployment architecture. I set up a Tailscale-based tailnet to enable secure connectivity between edge devices and cloud services across sites, evaluated infrastructure and deployment options, and presented recommendations directly to engineering leadership, taking the project from an architectural concept through to a working, observable production system. 

This infrastructure work is laying the foundation for the company's broader expansion into additional edge IoT features for measuring vitals and supervised care through hyperautomation.
