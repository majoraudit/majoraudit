import requests
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import LimitOffsetPagination
from .models import Course
from .serializers import CourseSerializer, CourseDetailSerializer

# Create your views here.


class CourseLimitOffsetPagination(LimitOffsetPagination):
    default_limit = 100
    limit_query_param = 'limit'


class CourseListView(generics.ListAPIView):
    serializer_class = CourseSerializer
    pagination_class = CourseLimitOffsetPagination

    def get_queryset(self):
        return Course.objects.prefetch_related(
            # Prefetch(
            'courseinstance_set__course_codes',
            # queryset=CourseInstance.objects.select_related('course')
            # .prefetch_related('course_professors', 'course_codes')
            # ),
            'distributionals'
        ).all()


class CourseDetailView(generics.RetrieveAPIView):
    serializer_class = CourseDetailSerializer
    lookup_field = 'external_id'

    queryset = Course.objects.prefetch_related(
        'courseinstance_set__course_professors',
        'distributionals'
    )


class CourseTableDetailProxyView(APIView):
    """
    Proxy selected CourseTable modal fields by course code and optional season.
    This avoids browser CORS issues while reusing CourseTable's own data model.
    """

    graphql_endpoint = "https://api.coursetable.com/ferry/v1/graphql"
    timeout_seconds = 8

    def get(self, request):
        course_code = (request.query_params.get("course_code") or "").strip()
        season_code = (request.query_params.get("season_code") or "").strip()

        if not course_code:
            return Response(
                {"detail": "course_code query param is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        query_with_season = """
        query CourseByCodeAndSeason($courseCode: String!, $seasonCode: String!) {
          listings(
            where: {
              course_code: { _eq: $courseCode }
              season_code: { _eq: $seasonCode }
            }
            order_by: [{ crn: asc }]
            limit: 1
          ) {
            listing_id
            crn
            course_code
            season_code
            school
            course {
              title
              description
              requirements
              syllabus_url
              course_home_url
              credits
              section
              classnotes
              regnotes
              rp_attr
              final_exam
              extra_info
              skills
              areas
              listings {
                course_code
                crn
              }
              course_professors {
                professor {
                  name
                }
              }
              course_meetings {
                days_of_week
                start_time
                end_time
              }
            }
          }
        }
        """

        query_latest = """
        query CourseByCodeLatest($courseCode: String!) {
          listings(
            where: { course_code: { _eq: $courseCode } }
            order_by: [{ season_code: desc }, { crn: asc }]
            limit: 1
          ) {
            listing_id
            crn
            course_code
            season_code
            school
            course {
              title
              description
              requirements
              syllabus_url
              course_home_url
              credits
              section
              classnotes
              regnotes
              rp_attr
              final_exam
              extra_info
              skills
              areas
              listings {
                course_code
                crn
              }
              course_professors {
                professor {
                  name
                }
              }
              course_meetings {
                days_of_week
                start_time
                end_time
              }
            }
          }
        }
        """

        query = query_with_season if season_code else query_latest
        variables = (
            {"courseCode": course_code, "seasonCode": season_code}
            if season_code
            else {"courseCode": course_code}
        )

        try:
            upstream = requests.post(
                self.graphql_endpoint,
                json={"query": query, "variables": variables},
                timeout=self.timeout_seconds,
            )
            upstream.raise_for_status()
            payload = upstream.json()
        except requests.RequestException:
            return Response(
                {"detail": "Unable to fetch CourseTable data right now."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except ValueError:
            return Response(
                {"detail": "Invalid response from CourseTable."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if payload.get("errors"):
            return Response(
                {"detail": "CourseTable query failed.", "errors": payload["errors"]},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        listings = (payload.get("data") or {}).get("listings") or []
        if not listings:
            return Response(
                {"detail": "No CourseTable listing found for this course."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"listing": listings[0]})
