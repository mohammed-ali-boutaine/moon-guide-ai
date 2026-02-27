# app/api/v1/api.py
# Aggregates all version-1 routers under the /api prefix.
# Each sub-router is responsible for:
#   - Receiving the HTTP request
#   - Validating input with Pydantic schemas
#   - Calling the appropriate service function
#   - Returning the response

from fastapi import APIRouter

from app.api.v1.routes import activity, admin, auth, classes, students, users

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(activity.router)
api_router.include_router(classes.router)
api_router.include_router(students.router)
api_router.include_router(admin.router)
