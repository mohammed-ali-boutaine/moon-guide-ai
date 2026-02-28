from celery import Celery

celery = Celery(
    "tasks",
    broker="redis://localhost:6379/0",  # Redis as the message broker
    backend="redis://localhost:6379/0",  # Redis as the result backend
)

celery.conf.task_routes = {"app.services.document_service.*": {"queue": "documents"}}