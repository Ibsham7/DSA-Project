# json_to_graph.py
import json

def load_graph(file_path):
    with open(file_path, "r") as f:
        data = json.load(f)

    graph = {}
    heuristic_coords = {}

    # Nodes
    for node in data["nodes"]:
        node_id = node["id"]
        heuristic_coords[node_id] = (node["x"], node["y"])
        graph[node_id] = []

    # Edges
    for edge in data["edges"]:
        from_node = edge["from"]
        to_node = edge["to"]
        distance = edge["distance"]
        allowed = edge["allowed_modes"]
        one_way = edge.get("one_way", False)

        graph[from_node].append({
            "to": to_node,
            "distance": distance,
            "allowed": allowed,
            "one_way": one_way
        })

        if not one_way:
            graph[to_node].append({
                "to": from_node,
                "distance": distance,
                "allowed": allowed,
                "one_way": one_way
            })

    return graph, heuristic_coords