from rest_framework import serializers

from worksheets.models import WorksheetMajor, WorksheetMajorAttemptApproval
from .catalog import CatalogError, catalog


class AttemptApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorksheetMajorAttemptApproval
        fields = ["worksheet_class", "approved_for"]


class WorksheetMajorSerializer(serializers.ModelSerializer):
    attempt_approvals = AttemptApprovalSerializer(many=True, required=False)

    class Meta:
        model = WorksheetMajor
        fields = ["id", "catalog_year", "major_id", "program_id", "declared_choices", "fact_ids", "attempt_approvals"]

    def validate(self, attrs):
        current = self.instance
        year = attrs.get("catalog_year", getattr(current, "catalog_year", "2026-2027"))
        major_id = attrs.get("major_id", getattr(current, "major_id", None))
        program_id = attrs.get("program_id", getattr(current, "program_id", None))
        try:
            asset = catalog.program(year, major_id, program_id)
        except (CatalogError, OSError, ValueError) as exc:
            raise serializers.ValidationError({"program_id": str(exc)}) from exc
        choices = attrs.get("declared_choices", getattr(current, "declared_choices", {}))
        declared = {str(item["meta"]["id"]): item for item in asset.ir.get("choices", []) if item.get("owner") == "DECLARED"}
        if set(choices) - set(declared):
            raise serializers.ValidationError({"declared_choices": "contains unknown choice ids"})
        for choice_id, value in choices.items():
            if value not in declared[choice_id]["alternatives"]:
                raise serializers.ValidationError({"declared_choices": f"invalid value for {choice_id}"})
        facts = attrs.get("fact_ids", getattr(current, "fact_ids", []))
        valid_facts = {str(item["meta"]["id"]) for item in asset.ir.get("facts", [])}
        if set(facts) - valid_facts:
            raise serializers.ValidationError({"fact_ids": "contains unknown fact ids"})
        worksheet_pk = self.context.get("view").kwargs.get("worksheet_pk") if self.context.get("view") else None
        if self.instance is None and worksheet_pk and WorksheetMajor.objects.filter(
            worksheet_id=worksheet_pk, catalog_year=year, major_id=major_id, program_id=program_id
        ).exists():
            raise serializers.ValidationError({"program_id": "program is already on this worksheet"})
        return attrs

    def create(self, validated_data):
        approvals = validated_data.pop("attempt_approvals", [])
        selected = super().create(validated_data)
        self._set_approvals(selected, approvals)
        return selected

    def update(self, instance, validated_data):
        approvals = validated_data.pop("attempt_approvals", None)
        selected = super().update(instance, validated_data)
        if approvals is not None:
            selected.attempt_approvals.all().delete()
            self._set_approvals(selected, approvals)
        return selected

    @staticmethod
    def _set_approvals(selected, approvals):
        for approval in approvals:
            worksheet_class = approval["worksheet_class"]
            if worksheet_class.worksheet_semester.worksheet_id != selected.worksheet_id:
                raise serializers.ValidationError("approval attempt is outside this worksheet")
            WorksheetMajorAttemptApproval.objects.create(worksheet_major=selected, **approval)
