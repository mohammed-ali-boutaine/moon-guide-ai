from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# Base schemas
class ClassBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Class name")
    description: str | None = Field(
        None, max_length=2048, description="Class description"
    )


class ClassCreate(ClassBase):
    """Schema for creating a new class"""

    pass


class ClassUpdate(BaseModel):
    """Schema for updating a class - all fields optional"""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2048)


# Student information in class context
class StudentInClass(BaseModel):
    """Student information when listed in a class"""

    id: UUID
    email: str
    first_name: str
    last_name: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Teacher information
class TeacherInfo(BaseModel):
    """Teacher basic information"""

    id: UUID
    email: str
    first_name: str
    last_name: str

    model_config = ConfigDict(from_attributes=True)


# Class responses
class ClassResponse(ClassBase):
    """Basic class information"""

    id: UUID
    teacher_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClassDetailResponse(ClassResponse):
    """Detailed class information with students"""

    students: list[StudentInClass] = []
    student_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ClassListResponse(ClassResponse):
    """Class information in list view"""

    student_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# Student's view of classes
class StudentClassResponse(BaseModel):
    """Class information from student perspective"""

    id: UUID
    name: str
    description: str | None
    teacher: TeacherInfo
    student_count: int
    joined_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Paginated response
class PaginatedClassResponse(BaseModel):
    """Paginated list of classes"""

    items: list[ClassListResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedStudentClassResponse(BaseModel):
    """Paginated list of classes for students"""

    items: list[StudentClassResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Student management
class AddStudentRequest(BaseModel):
    """Request to add a student to a class by email"""

    email: str = Field(..., description="Student email address")


class AddStudentResponse(BaseModel):
    """Response after adding a student"""

    message: str
    student: StudentInClass

    model_config = ConfigDict(from_attributes=True)


class RemoveStudentResponse(BaseModel):
    """Response after removing a student"""

    message: str
