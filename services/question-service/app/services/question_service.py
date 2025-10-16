from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Tuple
import logging

from app.models.question import Question, DifficultyLevel
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionFilter
from app.core.exceptions import QuestionNotFoundError, DatabaseError, QuestionValidationError
from app.utils.json_utils import safe_json_dumps, safe_json_loads
from app.utils.validation_utils import validate_title, validate_topics, validate_image_urls

logger = logging.getLogger(__name__)


class QuestionService:

    @staticmethod
    def create_question(db: Session, question_data: QuestionCreate) -> Question:
        """Create a new question with validation"""
        try:
            # Validate input data
            if not validate_title(question_data.title):
                raise QuestionValidationError("title", "Invalid title format")

            if not validate_topics(question_data.topics):
                raise QuestionValidationError("topics", "Invalid topics format")

            # Validate and filter images if provided
            validated_images = None
            if question_data.images:
                validated_images = validate_image_urls(question_data.images)

            db_question = Question(
                title=question_data.title,
                description=question_data.description,
                difficulty=question_data.difficulty,
                topics=safe_json_dumps(question_data.topics),
                examples=safe_json_dumps(question_data.examples) if question_data.examples else None,
                constraints=question_data.constraints,
                test_cases=safe_json_dumps(question_data.test_cases) if question_data.test_cases else None,
                images=safe_json_dumps(validated_images) if validated_images else None,
                is_active=question_data.is_active
            )

            db.add(db_question)
            db.commit()
            db.refresh(db_question)
            logger.info(f"Created question with ID {db_question.id}: {db_question.title}")
            return db_question

        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error creating question: {e}")
            raise DatabaseError("create", e)
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error creating question: {e}")
            raise

    @staticmethod
    def get_question(db: Session, question_id: int) -> Optional[Question]:
        """Get a question by ID"""
        return db.query(Question).filter(Question.id == question_id).first()

    @staticmethod
    def get_questions(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        filters: Optional[QuestionFilter] = None,
        include_inactive: bool = False
    ) -> Tuple[List[Question], int]:
        """Get questions with pagination and filtering"""
        query = db.query(Question)

        # Filter by active status unless explicitly requested
        if not include_inactive:
            query = query.filter(Question.is_active == True)

        if filters:
            if filters.difficulty:
                query = query.filter(Question.difficulty == filters.difficulty)

            if filters.topics:
                topic_conditions = []
                for topic in filters.topics:
                    topic_conditions.append(Question.topics.contains(f'"{topic}"'))
                query = query.filter(or_(*topic_conditions))

            if filters.search:
                search_term = f"%{filters.search}%"
                query = query.filter(
                    or_(
                        Question.title.ilike(search_term),
                        Question.description.ilike(search_term)
                    )
                )

        total = query.count()
        questions = query.offset(skip).limit(limit).all()
        return questions, total

    @staticmethod
    def update_question(
        db: Session,
        question_id: int,
        question_data: QuestionUpdate
    ) -> Optional[Question]:
        """Update a question"""
        db_question = QuestionService.get_question(db, question_id)
        if not db_question:
            return None

        update_data = question_data.model_dump(exclude_unset=True)

        # Serialize JSON fields with validation
        if 'topics' in update_data:
            if not validate_topics(update_data['topics']):
                raise QuestionValidationError("topics", "Invalid topics format")
            update_data['topics'] = safe_json_dumps(update_data['topics'])
        if 'examples' in update_data:
            update_data['examples'] = safe_json_dumps(update_data['examples']) if update_data['examples'] else None
        if 'test_cases' in update_data:
            update_data['test_cases'] = safe_json_dumps(update_data['test_cases']) if update_data['test_cases'] else None
        if 'images' in update_data:
            validated_images = validate_image_urls(update_data['images']) if update_data['images'] else None
            update_data['images'] = safe_json_dumps(validated_images) if validated_images else None

        for field, value in update_data.items():
            setattr(db_question, field, value)

        db.commit()
        db.refresh(db_question)
        return db_question

    @staticmethod
    def delete_question(db: Session, question_id: int) -> bool:
        """Delete a question"""
        db_question = QuestionService.get_question(db, question_id)
        if not db_question:
            return False

        db.delete(db_question)
        db.commit()
        return True

    @staticmethod
    def get_questions_by_topics_and_difficulty(
        db: Session,
        topics: Optional[List[str]] = None,
        difficulty: Optional[str] = None
    ) -> List[Question]:
        """Get questions filtered by topics and/or difficulty level"""
        query = db.query(Question).filter(Question.is_active == True)

        if difficulty:
            query = query.filter(Question.difficulty == difficulty)

        if topics:
            topic_conditions = []
            for topic in topics:
                topic_conditions.append(Question.topics.contains(f'"{topic}"'))
            query = query.filter(or_(*topic_conditions))

        return query.all()