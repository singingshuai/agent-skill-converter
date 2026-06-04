from typing import Dict, List, Optional, Union
from pydantic import BaseModel, Field


class Triggers(BaseModel):
    keywords: List[str] = Field(default_factory=list)
    intent: str = ""


class ResourceItem(BaseModel):
    path: str
    description: str = ""


class WorkflowStep(BaseModel):
    step: int
    description: str
    notes: Optional[str] = None


class Outputs(BaseModel):
    format: str = ""
    must_include: List[str] = Field(default_factory=list)


class AgentSkillSpec(BaseModel):
    name: str
    description: str
    version: str = "1.0.0"
    source_platform: str
    target_platform: Optional[str] = None
    triggers: Triggers = Field(default_factory=Triggers)
    inputs: List[str] = Field(default_factory=list)
    workflow: List[WorkflowStep] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    outputs: Outputs = Field(default_factory=Outputs)
    resources: List[ResourceItem] = Field(default_factory=list)
    examples: List[str] = Field(default_factory=list)
    metadata: Dict[str, object] = Field(default_factory=dict)


class ConvertRequest(BaseModel):
    source_platform: str
    target_platform: str
    input_type: str = "markdown"
    content: str


class ConvertResponse(BaseModel):
    success: bool
    spec: Optional[AgentSkillSpec] = None
    output_files: List[Dict[str, str]] = Field(default_factory=list)
    loss_report: Dict[str, List[str]]
    error: Optional[str] = None
