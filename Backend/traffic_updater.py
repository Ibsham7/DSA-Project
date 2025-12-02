# traffic_updater.py
import random
import config

def initialize_traffic_multipliers(graph):
    traffic_multipliers = {}
    for u in graph:
        for edge in graph[u]:
            v = edge["to"]
            traffic_multipliers[(u, v)] = config.DEFAULT_TRAFFIC_MULTIPLIER
    return traffic_multipliers

def apply_random_traffic(traffic_multipliers, graph):
    # pick a random edge
    u = random.choice(list(graph.keys()))
    neighbor = random.choice(graph[u])
    v = neighbor["to"]

    # apply random multiplier (increase or decrease)
    traffic_multipliers[(u, v)] = random.uniform(
        config.MIN_TRAFFIC_MULTIPLIER,
        config.MAX_TRAFFIC_MULTIPLIER
    )