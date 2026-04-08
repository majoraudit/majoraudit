from rest_framework import serializers

from worksheets.models import WorksheetMajor


class WorksheetMajorSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorksheetMajor
        fields = ['id', 'major_id', 'degree_type']

    def validate(self, attrs):
        """
        Enforce the (worksheet, major_id, degree_type) unique constraint at
        validation time so duplicates return a clean 400 instead of bubbling
        a raw IntegrityError as a 500. The worksheet is supplied via the
        view's `worksheet_pk` URL kwarg (passed through serializer context).
        """
        worksheet_pk = self.context.get('worksheet_pk')
        if worksheet_pk is None:
            return attrs

        # Only relevant on create — on update we'd allow keeping the same row.
        if self.instance is not None:
            return attrs

        major_id = attrs.get('major_id')
        degree_type = attrs.get('degree_type')
        if WorksheetMajor.objects.filter(
            worksheet_id=worksheet_pk,
            major_id=major_id,
            degree_type=degree_type,
        ).exists():
            raise serializers.ValidationError(
                {'detail': f'{major_id} ({degree_type}) is already on this worksheet.'}
            )
        return attrs
