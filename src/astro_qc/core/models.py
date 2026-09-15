from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class QCGrade(str, Enum):
    PASS = "PASS"
    WARNING = "WARNING"
    CONDITIONAL = "CONDITIONAL"
    FAIL = "FAIL"
    NOT_EVALUABLE = "NOT_EVALUABLE"


class Provenance(BaseModel):
    source_file: str
    hdu: int = 0
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    software_version: str = "0.1.0"
    processing_level: str = "raw"


class MetricDefinition(BaseModel):
    id: str
    description: str
    unit: str
    algorithm: str
    version: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class MetricResult(BaseModel):
    metric_id: str
    value: Union[float, int, str, bool, None]
    definition: MetricDefinition
    provenance: Provenance
    context: Dict[str, Any] = Field(default_factory=dict)


class RuleSeverity(str, Enum):
    WARNING = "WARNING"
    CONDITIONAL = "CONDITIONAL"
    FAIL = "FAIL"


class Rule(BaseModel):
    id: str
    metric_id: str
    operator: str  # "<", ">", "<=", ">=", "==", "!="
    threshold_value: Union[float, int, str, bool]
    severity: RuleSeverity
    description: str


class RuleResult(BaseModel):
    rule: Rule
    metric_value: Union[float, int, str, bool, None]
    status: QCGrade
    reason: str


class FileQC(BaseModel):
    file_path: str
    file_hash: str
    integrity_pass: bool
    headers_pass: bool
    corrupt_hdus: List[int] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class QCResult(BaseModel):
    product_id: str
    file_qc: FileQC
    metrics: Dict[str, MetricResult] = Field(default_factory=dict)
    rule_results: List[RuleResult] = Field(default_factory=list)
    overall_grade: QCGrade = QCGrade.NOT_EVALUABLE
    profile_name: str = "default"
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
