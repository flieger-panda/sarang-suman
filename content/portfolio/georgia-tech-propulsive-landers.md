# EKF-Based Sensor Fusion for UAV Flight Control

**Georgia Tech Propulsive Landers**, Avionics & GNC
Aug. 2024 – May 2025 | Atlanta, GA

**Stack:** C++, Python

I contributed to the Avionics and Guidance, Navigation & Control (GNC) subteam of Georgia Tech's Propulsive Landers project, focused on real-time state estimation for an autonomous UAV platform.

I implemented an Extended Kalman Filter (EKF) based sensor fusion algorithm in C++ to estimate the vehicle's real-time state, including position, velocity, and orientation, for use in a closed-loop flight control system. I put particular emphasis on minimizing estimation latency to keep pace with control-loop timing requirements.

I also developed and benchmarked multi-sensor data fusion pipelines in Python, combining input from an IMU, altimeter, and GPS to feed the estimator. I iterated on filter tuning and preprocessing to improve signal stability and filtering accuracy, validating the pipeline against sensor noise and dropout conditions typical of flight hardware. The work combined low-level embedded and control programming with applied estimation theory, directly supporting the reliability of the vehicle's autonomous flight control.
