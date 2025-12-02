# simulator.py
import traffic_updater
import pathfinder
import config


def run_simulation(graph, heuristic_coords, traffic_multipliers, start, goal, mode, max_steps=20):
    current_node = start
    path, cost = pathfinder.a_star(graph, heuristic_coords, traffic_multipliers, current_node, goal, mode)

    if not path:
        print("No path found")
        return

    print(f"\nInitial path: {path} | Cost: {cost:.2f}\n")
    step_counter = 0

    while current_node != goal and step_counter < max_steps:
        step_counter += 1
        print(f"Step {step_counter}:")

        # Move to next node
        if len(path) > 1:
            current_node = path[1]
            print(f"  Moved to {current_node}")
            path = path[1:]  # update remaining path

        # Store previous state for comparison
        prev_path = path.copy()
        prev_cost = sum(
            graph[prev_path[i]][j]["distance"] * traffic_multipliers.get(
                (prev_path[i], graph[prev_path[i]][j]["to"]), config.DEFAULT_TRAFFIC_MULTIPLIER
            )
            for i in range(len(prev_path) - 1)
            for j in range(len(graph[prev_path[i]]))
            if graph[prev_path[i]][j]["to"] == prev_path[i + 1]
        ) if len(prev_path) > 1 else 0

        # Apply random traffic changes
        traffic_updater.apply_random_traffic(traffic_multipliers, graph)

        # Compute a new path from the current node
        new_path, new_cost = pathfinder.a_star(graph, heuristic_coords, traffic_multipliers, current_node, goal, mode)
        if not new_path:
            print("  No alternative path found. Continuing on current path.")
            continue

        # Show comparison
        print(f"  Previous remaining path: {prev_path} | Cost: {prev_cost:.2f}")
        print(f"  New path: {new_path} | Cost: {new_cost:.2f}")

        # Decide rerouting
        if new_path != prev_path:
            print("  Rerouting needed! Updating path...\n")
            path = new_path
        else:
            print("  No rerouting needed.\n")