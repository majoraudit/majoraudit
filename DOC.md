# Basic Documentation

I suggest you open two separate shells for this

## Running the backend

This is assuming you already have the repository and are in the root directory. You may need to use python3 instead of python, and also update python and/or pip

> cd backend
>
> python -m venv .venv
>
> source .venv/bin/activate
>
> pip install -r requirements.txt

This is to create and activate a virtual environment, on every time you close and reopen the backend you will have to re-enter your virtual environment

> source .venv/bin/activate

You will need a couple of environment variables (put them in a .env file in the backend/ folder)

> DJANGO_SECRET_KEY="putarandomlongstringhere"
>
> DJANGO_DEBUG='True'
>
> COOKIE_SAMESITE='None'
>
> FRONTEND_URL='https://localhost:5173'
>
> CAS_URL="https://secure-tst.its.yale.edu/cas/"
>
> YALIES_URL="https://api.yalies.io/v2/"
>
> YALIES_API_KEY="get an api key from yalies"

The API key from Yalies can be found here: "https://yalies.io/api"

You can run the actual backend by doing

> python manage.py migrate
>
> python manage.py runsslserver

This puts the Django backend running on https://localhost:8000
You can access the backend from just directly accessing the backend urls (found in each urls.py).
To send requests from the frontend to the backend, you will have to send an HTTP request to a view (in each of the views.py)
Check out django-rest-framework for more details, many basic ones are already implemented.

## Running the frontend

From root (do this in another shell)

> cd frontend
>
> npm i

This installs all dependencies.

You will need some environment variables, also in a .env (frontend/)

> VITE_BACKEND_API_URL='https://localhost:8000/api'

Then run

> npm run dev

This then runs the development environment on https://localhost:5173

If you want to make backend requests, there is currently an apiClient.ts file built in, where you can send requests from there.

## The Admin Site

Login to the frontend with the "Login with CAS" button, then while in the backend directory, do the following (you may do this in another shell, or cancel the running sslserver and do this there)

> python manage.py shell
> 
> user = CustomUser.objects.get(username='yournetid')
> 
> user.is_staff = True
> 
> user.is_superuser = True
>
> user.save()

Now go to 'https://localhost:8000/admin' (you may need to restart the sslserver with python manage.py runsslserver if you previously cancelled it), and login in. You can interact with most of the things in the database and view things from here.