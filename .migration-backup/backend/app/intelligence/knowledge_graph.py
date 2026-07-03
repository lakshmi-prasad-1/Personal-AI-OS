from typing import Any, Dict, List


def build_graph_from_entities(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Create a simple graph payload from entity and relationship definitions."""
    normalized_nodes = [
        {
            "id": node["id"],
            "entity_type": node.get("entity_type", "Unknown"),
            "label": node.get("label", "Untitled"),
            "metadata": node.get("metadata", {}),
        }
        for node in nodes
    ]
    normalized_edges = [
        {
            "source": edge["source"],
            "target": edge["target"],
            "relationship_type": edge.get("relationship_type", "RELATED"),
            "weight": edge.get("weight", 1.0),
        }
        for edge in edges
    ]
    return {"nodes": normalized_nodes, "edges": normalized_edges}
