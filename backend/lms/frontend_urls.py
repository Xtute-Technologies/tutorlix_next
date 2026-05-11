from urllib.parse import urlparse, urlunparse

from django.conf import settings


def get_frontend_base_url(request=None):
    fallback_url = getattr(settings, "FRONTEND_URL", "https://tutorlix.com").rstrip("/")

    if request is None:
        return fallback_url

    for header_name in ("HTTP_ORIGIN", "HTTP_REFERER"):
        raw_url = request.META.get(header_name)
        if not raw_url:
            continue

        parsed_url = urlparse(raw_url)
        if parsed_url.scheme in {"http", "https"} and parsed_url.netloc:
            return urlunparse((parsed_url.scheme, parsed_url.netloc, "", "", "", "")).rstrip("/")

    return fallback_url


def build_frontend_url(request, path):
    clean_path = f"/{str(path).lstrip('/')}"
    return f"{get_frontend_base_url(request)}{clean_path}"
