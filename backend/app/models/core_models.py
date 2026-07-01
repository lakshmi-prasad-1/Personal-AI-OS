import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, func, Float, ForeignKey, Boolean, Integer, Text
from sqlalchemy.orm import relationship
from app.models.base import Base

try:
    from sqlalchemy.dialects.postgresql import UUID, TEXT, JSONB
except Exception:  # pragma: no cover - fallback if psycopg is unavailable
    from sqlalchemy import Uuid as UUID, Text as TEXT, JSON as JSONB  # type: ignore

try:
    from pgvector.sqlalchemy import Vector
except Exception:  # pragma: no cover - fallback if pgvector is unavailable
    from sqlalchemy import JSON as Vector  # type: ignore


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="user", cascade="all, delete-orphan")
    resources = relationship("Resource", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    ideas = relationship("Idea", back_populates="user", cascade="all, delete-orphan")
    graph_nodes = relationship("GraphNode", back_populates="user", cascade="all, delete-orphan")
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Structured User Profile (AI Brain source of truth for user identity)
# ---------------------------------------------------------------------------
class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    display_name = Column(String, nullable=True)
    bio = Column(TEXT, nullable=True)
    institution = Column(String, nullable=True)
    current_semester = Column(String, nullable=True)
    career_interests = Column(JSONB, default=list)
    skills = Column(JSONB, default=list)
    goals = Column(JSONB, default=list)
    current_projects = Column(JSONB, default=list)
    current_work = Column(TEXT, nullable=True)
    resume_summary = Column(TEXT, nullable=True)
    preferences = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="profile")


# ---------------------------------------------------------------------------
# Chat & Messages
# ---------------------------------------------------------------------------
class Chat(Base):
    __tablename__ = "chats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # user, assistant, system
    content = Column(TEXT, nullable=False)
    token_count = Column(Integer, nullable=True)
    model_used = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chat = relationship("Chat", back_populates="messages")


# ---------------------------------------------------------------------------
# Memory System
# ---------------------------------------------------------------------------
class Memory(Base):
    __tablename__ = "memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False, index=True)
    description = Column(TEXT, nullable=False)
    category = Column(String, nullable=False, index=True)  # Goals, Skills, Resume, Career, Companies, DailyNotes, CodingProgress, LeetCodeProgress, Random
    tags = Column(JSONB, default=list)
    importance_score = Column(Float, default=0.5)
    confidence_score = Column(Float, default=1.0)
    embedding = Column(Vector(1536))
    source_message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="memories")


# ---------------------------------------------------------------------------
# Resource Vault
# ---------------------------------------------------------------------------
class Resource(Base):
    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False, index=True)
    description = Column(TEXT, nullable=True)
    # category: PDF, Article, Blog, GitHub, YouTube, Course, Documentation, CodeSnippet
    category = Column(String, nullable=False, index=True)
    file_type = Column(String, nullable=True)  # pdf, url, video, code, etc.
    file_path = Column(String, nullable=True)   # Local file path (for uploads)
    source_url = Column(String, nullable=True)  # External URL
    tags = Column(JSONB, default=list)
    difficulty = Column(String, nullable=True)  # beginner, intermediate, advanced
    status = Column(String, default="unread", index=True)  # unread, reading, completed, archived
    priority = Column(Integer, default=3)  # 1 (highest) to 5 (lowest)
    notes = Column(TEXT, nullable=True)
    ai_summary = Column(TEXT, nullable=True)
    embedding = Column(Vector(1536))
    is_processed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="resources")


# ---------------------------------------------------------------------------
# Notes (with Folders)
# ---------------------------------------------------------------------------
class NoteFolder(Base):
    __tablename__ = "note_folders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    parent_folder_id = Column(UUID(as_uuid=True), ForeignKey("note_folders.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    notes = relationship("Note", back_populates="folder")
    subfolders = relationship("NoteFolder", backref="parent_folder", remote_side="NoteFolder.id")


class Note(Base):
    __tablename__ = "notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    folder_id = Column(UUID(as_uuid=True), ForeignKey("note_folders.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False, index=True)
    content = Column(TEXT, nullable=False)
    tags = Column(JSONB, default=list)
    is_markdown = Column(Boolean, default=True)
    is_pinned = Column(Boolean, default=False)
    embedding = Column(Vector(1536))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="notes")
    folder = relationship("NoteFolder", back_populates="notes")


# ---------------------------------------------------------------------------
# Ideas Vault
# ---------------------------------------------------------------------------
class Idea(Base):
    __tablename__ = "ideas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False, index=True)
    content = Column(TEXT, nullable=False)
    # category: Startup, Project, Research, RandomThought
    category = Column(String, default="RandomThought", index=True)
    tags = Column(JSONB, default=list)
    status = Column(String, default="raw")   # raw, exploring, validated, archived
    priority = Column(Integer, default=3)
    embedding = Column(Vector(1536))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="ideas")


# ---------------------------------------------------------------------------
# Knowledge Graph
# ---------------------------------------------------------------------------
class GraphNode(Base):
    __tablename__ = "graph_nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    entity_type = Column(String, nullable=False, index=True)  # Resource, Skill, Company, Project, Note, Memory
    entity_id = Column(UUID(as_uuid=True), nullable=True)     # FK to the actual entity
    label = Column(String, nullable=False)
    node_metadata = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="graph_nodes")
    outgoing_edges = relationship("GraphEdge", foreign_keys="GraphEdge.source_node_id", cascade="all, delete-orphan")
    incoming_edges = relationship("GraphEdge", foreign_keys="GraphEdge.target_node_id", cascade="all, delete-orphan")


class GraphEdge(Base):
    __tablename__ = "graph_edges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_node_id = Column(UUID(as_uuid=True), ForeignKey("graph_nodes.id", ondelete="CASCADE"), nullable=False)
    target_node_id = Column(UUID(as_uuid=True), ForeignKey("graph_nodes.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(String, nullable=False)  # REQUIRES, EXTENDS, TAUGHT_BY, USED_IN, etc.
    weight = Column(Float, default=1.0)
    edge_metadata = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source_node = relationship("GraphNode", foreign_keys=[source_node_id], back_populates="outgoing_edges")
    target_node = relationship("GraphNode", foreign_keys=[target_node_id], back_populates="incoming_edges")
