from .settings import *  # noqa: F403

SECRET_KEY = 'backend-tests-only'
DEBUG = False
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
CAS_SERVER_URL = 'https://cas.invalid/cas/'
CAS_ROOT_PROXIED_AS = None
CAS_STORE_NEXT = True
FRONTEND_URL = 'https://testserver'
CAS_REDIRECT_URL = FRONTEND_URL + '/'
CAS_LOGOUT_REDIRECT_URL = FRONTEND_URL
CORS_ALLOWED_ORIGINS = [FRONTEND_URL]
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
YALIES_URL = ''
YALIES_API_KEY = ''
