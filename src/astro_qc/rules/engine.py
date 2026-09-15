import yaml
from pathlib import Path
from typing import Dict, List, Any
from pydantic import BaseModel

from astro_qc.core.models import QCResult, Rule, RuleResult, RuleSeverity, QCGrade

class QualityProfile(BaseModel):
    name: str
    description: str
    rules: List[Rule]

def evaluate_qc(qc_result: QCResult, profile: QualityProfile) -> QCResult:
    qc_result.profile_name = profile.name
    results = []
    
    worst_grade = QCGrade.PASS
    
    for rule in profile.rules:
        if rule.metric_id not in qc_result.metrics:
            results.append(RuleResult(
                rule=rule,
                metric_value=None,
                status=QCGrade.NOT_EVALUABLE,
                reason=f"Metric {rule.metric_id} not available in QC Result"
            ))
            # NOT_EVALUABLE doesn't necessarily fail the image, but we record it.
            if worst_grade == QCGrade.PASS:
                worst_grade = QCGrade.CONDITIONAL
            continue
            
        metric = qc_result.metrics[rule.metric_id]
        val = metric.value
        if val is None:
            results.append(RuleResult(
                rule=rule,
                metric_value=None,
                status=QCGrade.NOT_EVALUABLE,
                reason=f"Metric {rule.metric_id} is None"
            ))
            continue
            
        # Evaluate
        passed = False
        try:
            if rule.operator == "<": passed = val < rule.threshold_value
            elif rule.operator == "<=": passed = val <= rule.threshold_value
            elif rule.operator == ">": passed = val > rule.threshold_value
            elif rule.operator == ">=": passed = val >= rule.threshold_value
            elif rule.operator == "==": passed = val == rule.threshold_value
            elif rule.operator == "!=": passed = val != rule.threshold_value
        except TypeError:
            pass # Handle comparison errors
            
        if passed:
            status = QCGrade.PASS
            reason = f"Passed: {val} {rule.operator} {rule.threshold_value}"
        else:
            if rule.severity == RuleSeverity.FAIL:
                status = QCGrade.FAIL
                worst_grade = QCGrade.FAIL
            elif rule.severity == RuleSeverity.CONDITIONAL:
                status = QCGrade.CONDITIONAL
                if worst_grade != QCGrade.FAIL:
                    worst_grade = QCGrade.CONDITIONAL
            else:
                status = QCGrade.WARNING
                if worst_grade == QCGrade.PASS:
                    worst_grade = QCGrade.WARNING
                    
            reason = f"Failed: {val} {rule.operator} {rule.threshold_value}"
            
        results.append(RuleResult(
            rule=rule,
            metric_value=val,
            status=status,
            reason=reason
        ))
        
    qc_result.rule_results = results
    
    # Check basic file integrity override
    if not qc_result.file_qc.integrity_pass:
        worst_grade = QCGrade.FAIL
        
    qc_result.overall_grade = worst_grade
    return qc_result

def get_default_profile() -> QualityProfile:
    return QualityProfile(
        name="default",
        description="Default conservative QC profile",
        rules=[
            Rule(
                id="default.psf.fwhm_max",
                metric_id="image.psf.fwhm_median",
                operator="<",
                threshold_value=10.0,
                severity=RuleSeverity.WARNING,
                description="FWHM should be reasonable"
            ),
            Rule(
                id="default.psf.ellipticity_max",
                metric_id="image.psf.ellipticity_median",
                operator="<",
                threshold_value=0.5,
                severity=RuleSeverity.WARNING,
                description="Stars should not be highly elliptical"
            ),
            Rule(
                id="default.artifacts.saturation",
                metric_id="image.artifacts.saturation_fraction",
                operator="<",
                threshold_value=0.05,
                severity=RuleSeverity.WARNING,
                description="Saturated pixels should be less than 5%"
            ),
            Rule(
                id="default.astrometry.has_wcs",
                metric_id="image.astrometry.has_wcs",
                operator="==",
                threshold_value=True,
                severity=RuleSeverity.CONDITIONAL,
                description="A valid WCS should be present"
            )
        ]
    )
