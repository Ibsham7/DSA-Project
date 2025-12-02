# pathfinder.py
import heapq
import math
import config

def euclidean_distance(a, b):
    return math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2)

def a_star(graph, heuristic_coords, traffic_multipliers, start, goal, mode):
    open_set = []
    heapq.heappush(open_set, (0, start))
    came_from = {}
    g_score = {node: float("inf") for node in graph}
    g_score[start] = 0

    f_score = {node: float("inf") for node in graph}
    f_score[start] = euclidean_distance(heuristic_coords[start], heuristic_coords[goal])

    while open_set:
        current_f, current = heapq.heappop(open_set)

        if current == goal:
            # reconstruct path
            path = []
            node = goal
            while node in came_from:
                path.append(node)
                node = came_from[node]
            path.append(start)
            path.reverse()
            return path, g_score[goal]

        for edge in graph[current]:
            if mode not in edge["allowed"]:
                continue

            neighbor = edge["to"]
            base_cost = edge["distance"]
            multiplier = traffic_multipliers.get((current, neighbor), config.DEFAULT_TRAFFIC_MULTIPLIER)
            tentative_g = g_score[current] + base_cost * multiplier

            if tentative_g < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + euclidean_distance(heuristic_coords[neighbor], heuristic_coords[goal])
                heapq.heappush(open_set, (f_score[neighbor], neighbor))

    return None, float("inf")  # no path found