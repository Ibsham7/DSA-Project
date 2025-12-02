# config.py
# Global simulation constants

SIM_MODES = ["car", "bicycle", "pedestrian"]

DEFAULT_TRAFFIC_MULTIPLIER = 1.0
MIN_TRAFFIC_MULTIPLIER = 0.5
MAX_TRAFFIC_MULTIPLIER = 3.0

REROUTE_THRESHOLD = 0.2  # rerun A* if path cost increases by 20% or more