# app/api/v1/routes/classes.py
"""
Teacher class-management routes — validate input → call ClassService → return response.
"""
import math
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.orm import Session as DBSession

from app.models.document import RoleEnum

from app.schemas.document import (
    DocumentUploadResponse,
    DocumentListResponse,
    DocumentRejectRequest,
    DocumentResponse,
)
from app.services.document_service import (
    upload_class_document,
    list_class_documents,
    approve_document,
    reject_document,
)

from app.core.database import get_db
from app.core.dependencies import TeacherUser,StudentUser,CurrentUser, get_current_user
from app.schemas.class_schema import (
    AddStudentRequest,
    AddStudentResponse,
    AddStudentsRequest,
    AddStudentsResponse,
    ClassCreate,
    ClassDetailResponse,
    ClassListResponse,
    ClassResponse,
    ClassUpdate,
    PaginatedClassResponse,
    RecentStudent,
    RemoveStudentResponse,
    StudentAddResult,
    StudentInClass,
)
from app.services.class_service import ClassService

router = APIRouter(prefix="/classes", tags=["classes"])


@router.post(
    "",
    response_model=ClassResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new class",
)
async def create_class(
    class_data: ClassCreate,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """Create a new class owned by the authenticated teacher."""
    return ClassService.create_class(db, current_user.id, class_data)


@router.get(
    "",
    response_model=PaginatedClassResponse,
    summary="List my classes",
)
async def list_my_classes(
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    search: Annotated[str | None, Query(description="Filter by class name")] = None,
):
    """Get paginated classes owned by the authenticated teacher."""
    skip = (page - 1) * page_size
    classes, total = ClassService.get_teacher_classes(
        db, current_user.id, skip=skip, limit=page_size, search=search
    )

    class_list = []
    for class_obj in classes:
        item = ClassListResponse.model_validate(class_obj)
        item.student_count = len(class_obj.class_students)
        class_list.append(item)

    return PaginatedClassResponse(
        items=class_list,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get(
    "/recent-joins",
    response_model=list[RecentStudent],
    summary="Recent student joins",
)
async def get_recent_joins(
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
):
    """Return recent student joins across all classes of the authenticated teacher."""
    return ClassService.get_recent_students_for_teacher(db, current_user.id, limit=limit)


@router.get(
    "/{class_id}",
    response_model=ClassDetailResponse,
    summary="Get class details",
)
async def get_class_detail(
    class_id: UUID,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
    search: Annotated[str | None, Query(description="Filter students by email")] = None,
):
    """Get detailed information about a specific class including enrolled students."""
    class_obj = ClassService.get_class_by_id(db, class_id, current_user.id, search=search)

    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or you don't have permission to access it",
        )

    join_dates = {cs.student_id: cs.joined_at for cs in class_obj.class_students}
    students = [
        StudentInClass(
            id=s.id,
            email=s.email,
            first_name=s.profile.first_name if s.profile else "",
            last_name=s.profile.last_name if s.profile else "",
            joined_at=join_dates.get(s.id),
        )
        for s in class_obj.students
    ]

    return ClassDetailResponse(
        id=class_obj.id,
        name=class_obj.name,
        description=class_obj.description,
        teacher_id=class_obj.teacher_id,
        created_at=class_obj.created_at,
        students=students,
        student_count=len(students),
    )


@router.put(
    "/{class_id}",
    response_model=ClassResponse,
    summary="Update a class",
)
async def update_class(
    class_id: UUID,
    class_data: ClassUpdate,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """Update name or description of a class. Only the owner can update."""
    updated = ClassService.update_class(db, class_id, current_user.id, class_data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or you don't have permission to update it",
        )
    return updated


@router.delete(
    "/{class_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a class",
)
async def delete_class(
    class_id: UUID,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """Delete a class and all its student enrollments. Only the owner can delete."""
    success = ClassService.delete_class(db, class_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or you don't have permission to delete it",
        )


@router.get(
    "/{class_id}/students",
    response_model=list[StudentInClass],
    summary="List students in class",
)
async def list_class_students(
    class_id: UUID,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """List all students enrolled in the class. Only the owner can access."""
    students = ClassService.get_class_students(db, class_id, current_user.id)
    if students is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or you don't have permission to access it",
        )

    return [
        StudentInClass(
            id=s.id,
            email=s.email,
            first_name=s.profile.first_name if s.profile else "",
            last_name=s.profile.last_name if s.profile else "",
            joined_at=ClassService.get_student_joined_date(db, class_id, s.id),
        )
        for s in students
    ]


@router.post(
    "/{class_id}/students",
    response_model=AddStudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a student to class",
)
async def add_student_to_class(
    class_id: UUID,
    student_data: AddStudentRequest,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """Add a student to the class by email. Only the owner can add students."""
    class_student, error = ClassService.add_student_to_class(
        db, class_id, student_data.email, current_user.id
    )
    if error:
        http_status = status.HTTP_404_NOT_FOUND
        if "already enrolled" in error:
            http_status = status.HTTP_409_CONFLICT
        elif "not a student" in error:
            http_status = status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=http_status, detail=error)

    class_obj = ClassService.get_class_with_students(db, class_id)
    student = next((s for s in class_obj.students if s.id == class_student.student_id), None)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving student information",
        )

    return AddStudentResponse(
        message="Student added successfully",
        student=StudentInClass(
            id=student.id,
            email=student.email,
            first_name=student.profile.first_name if student.profile else "",
            last_name=student.profile.last_name if student.profile else "",
            joined_at=class_student.joined_at,
        ),
    )


@router.post(
    "/{class_id}/students/batch",
    response_model=AddStudentsResponse,
    summary="Add multiple students to class",
)
async def add_students_batch(
    class_id: UUID,
    students_data: AddStudentsRequest,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """Add multiple students by email in a single request. Only the owner can add students."""
    results, error = ClassService.add_students_to_class_batch(
        db, class_id, students_data.emails, current_user.id
    )
    if error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error)

    student_results = [
        StudentAddResult(
            email=r["email"],
            success=r["success"],
            error=r["error"],
            student=StudentInClass(**r["student_data"]) if r["student_data"] else None,
        )
        for r in results
    ]

    successful = sum(1 for r in results if r["success"])
    failed = len(results) - successful

    response = AddStudentsResponse(
        results=student_results,
        summary={"total": len(results), "successful": successful, "failed": failed},
    )

    if failed == len(results) and results:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add all students",
        )
    return response


@router.delete(
    "/{class_id}/students/{student_id}",
    response_model=RemoveStudentResponse,
    summary="Remove a student from class",
)
async def remove_student_from_class(
    class_id: UUID,
    student_id: UUID,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """Remove a student from the class. Only the owner can remove students."""
    success, error = ClassService.remove_student_from_class(
        db, class_id, student_id, current_user.id
    )
    if error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error)
    return RemoveStudentResponse(message="Student removed successfully")



@router.post("/classes/{class_id}/documents", response_model=DocumentUploadResponse, status_code=201)
async def upload_class_doc(
    class_id: int,
    background_tasks: BackgroundTasks,
    current_user: Annotated[StudentUser | TeacherUser, Depends(get_current_user)],
    db: Annotated[DBSession, Depends(get_db)],
    file: UploadFile = File(..., description="PDF, DOCX, TXT or MD file (max 50 MB)"),
):
    """
    Upload a document to a class.
    - Teachers: auto-approved, immediately processed.
    - Students: enters 'pending' state, awaiting teacher approval.
    """

    uploaded_by_id = current_user.id
    uploaded_by_role = RoleEnum.teacher if isinstance(current_user, TeacherUser) else RoleEnum.student

    doc = upload_class_document(
        file=file,
        class_id=class_id,
        uploaded_by_id=uploaded_by_id,
        uploaded_by_role=uploaded_by_role,
        background_tasks=background_tasks,
        db=db,
    )
    msg = (
        "File uploaded and approved. Text extraction running."
        if uploaded_by_role == RoleEnum.teacher
        else "File uploaded. Awaiting teacher approval."
    )
    return DocumentUploadResponse(
        document_id=doc.id,
        status=doc.status,
        filename=doc.filename,
        file_type=doc.file_type,
        message=msg,
    )


@router.get("/classes/{class_id}/documents", response_model=DocumentListResponse)
def get_class_documents(
    class_id: int,
    currentUser : CurrentUser,
    db: Annotated[DBSession, Depends(get_db)]
):
    """List approved/ready documents for a class. Accessible by all roles."""
    # if student check if student part of class
    # if teacher check if he class creator
    # if admin return

    if currentUser.role.name == RoleEnum.student.value:
        if not ClassService.is_student_in_class(db, class_id, currentUser.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this class",
            )
    elif currentUser.role.name == RoleEnum.teacher.value:
        if not ClassService.is_teacher_of_class(db, class_id, currentUser.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access documents for this class",
            )
    elif currentUser.role.name == RoleEnum.admin.value:
        pass  # Admin can access all documents

    docs = list_class_documents(class_id=class_id, db=db)
    return DocumentListResponse(documents=docs, total=len(docs))



@router.post("/documents/{document_id}/approve", response_model=DocumentResponse)
def approve_doc(
    document_id: int,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """Approve a pending class document. Teacher only."""

    # check if teacher is owner of class related to document
    if not ClassService.is_teacher_of_document(db, document_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to approve this document",
        )
    
    teacher_id = current_user.id
    doc = approve_document(
        document_id=document_id,
        teacher_id=teacher_id,
        background_tasks=background_tasks,
        db=db,
    )
    return doc


@router.post("/documents/{document_id}/reject", response_model=DocumentResponse)
def reject_doc(
    document_id: int,
    body: DocumentRejectRequest,
    currentUser: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """Reject a pending class document. Teacher only."""

    # check if teacher is owner of class related to document
    if not ClassService.is_teacher_of_document(db, document_id, currentUser.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to reject this document",
        )

    teacher_id = currentUser.id
    doc = reject_document(
        document_id=document_id,
        teacher_id=teacher_id,
        reason=body.reason,
        db=db,
    )
    return doc