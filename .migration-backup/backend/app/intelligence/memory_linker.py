"""Link related memories to make the memory store more connected."""

from __future__ import annotations

from typing import Any, Dict, List, Set


class MemoryLinker:
    """Create lightweight relationship suggestions between memories."""

    def link(self, memories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        relationships: List[Dict[str, Any]] = []
        for index, source in enumerate(memories):
            source_tags = {str(tag).lower() for tag in source.get("tags", [])}
            for target in memories[index + 1 :]:
                target_tags = {str(tag).lower() for tag in target.get("tags", [])}
                overlap = source_tags & target_tags
                if overlap:
                    relationships.append({
                        "source": source.get("id"),
                        "target": target.get("id"),
                        "type": "RELATED_TO",
                        "shared_tags": sorted(overlap),
                    })
        return relationships
