from rest_framework import serializers

from worksheets.models import WorksheetMajor


class WorksheetMajorSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorksheetMajor
        fields = ['id', 'major_id', 'specialization']

    def validate(self, attrs):
        """
        Enforce the (worksheet, major_id, specialization) unique constraint
        at validation time so duplicates return a clean 400 instead of
        bubbling a raw IntegrityError as a 500. The worksheet is supplied
        via the view's `worksheet_pk` URL kwarg (passed through serializer
        context).
        """
        worksheet_pk = self.context.get('worksheet_pk')
        if worksheet_pk is None:
            return attrs

        if self.instance is not None:
            return attrs

        major_id = attrs.get('major_id')
        specialization = attrs.get('specialization', '')
        if WorksheetMajor.objects.filter(
            worksheet_id=worksheet_pk,
            major_id=major_id,
            specialization=specialization,
        ).exists():
            label = specialization or "default"
            raise serializers.ValidationError(
                {'detail': f'{major_id} ({label}) is already on this worksheet.'}
            )
        return attrs
