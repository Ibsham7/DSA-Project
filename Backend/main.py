# main.py
from json_to_graph import load_graph
import traffic_updater
import simulator

def main():
    # Load map and graph
    graph, heuristic_coords = load_graph("map.json")
    traffic_multipliers = traffic_updater.initialize_traffic_multipliers(graph)

    # Show available nodes to the user
    nodes_list = list(graph.keys())
    print("Available nodes:", nodes_list)

    # Get user input for start node
    while True:
        start_node = input("Enter starting node: ").strip()
        if start_node in nodes_list:
            break
        print("Invalid node. Please choose from the list.")

    # Get user input for goal node
    while True:
        goal_node = input("Enter goal node: ").strip()
        if goal_node in nodes_list and goal_node != start_node:
            break
        print("Invalid node. Please choose a different node from the list.")

    # Get agent mode
    print("Available modes:", traffic_updater.config.SIM_MODES)
    while True:
        agent_mode = input("Enter agent mode: ").strip().lower()
        if agent_mode in traffic_updater.config.SIM_MODES:
            break
        print("Invalid mode. Choose from the list above.")

    # Run the simulation
    simulator.run_simulation(graph, heuristic_coords, traffic_multipliers, start_node, goal_node, agent_mode)

if __name__ == "__main__":
    main()
