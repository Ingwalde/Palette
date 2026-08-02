from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..email_service import send_verification_email
from ..rate_limit import limiter
from ..security import (
    authenticate_user,
    create_access_token,
    create_email_verification_token,
    decode_email_verification_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_VERIFY_LINK_INVALID = "Invalid or expired verification link"


@router.post("/register", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
def register_user(
    request: Request,
    user_data: schemas.UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    existing_user = crud.get_user_by_username(db, user_data.username)

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already registered",
        )

    existing_email = crud.get_user_by_email(db, user_data.email)

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    user = crud.create_user(
        db=db,
        user_data=user_data,
        password_hash=hash_password(user_data.password),
        is_admin=False,
    )

    token = create_email_verification_token(user.id)
    background_tasks.add_task(send_verification_email, user.email, user.username, token)

    return user


@router.get("/verify", response_model=schemas.MessageResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    user_id = decode_email_verification_token(token)

    if user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_VERIFY_LINK_INVALID)

    user = crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_VERIFY_LINK_INVALID)

    if not user.email_verified:
        crud.set_email_verified(db, user)

    return schemas.MessageResponse(message="Email verified successfully")


@router.post("/resend-verification", response_model=schemas.MessageResponse)
@limiter.limit("3/hour")
def resend_verification(
    request: Request,
    payload: schemas.ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = crud.get_user_by_email(db, payload.email)

    # Only send for an existing, still-unverified account, but always return the same
    # generic message so the endpoint cannot be used to probe which emails are registered.
    if user is not None and not user.email_verified:
        token = create_email_verification_token(user.id)
        background_tasks.add_task(send_verification_email, user.email, user.username, token)

    return schemas.MessageResponse(
        message="If that email is registered and unverified, a verification link has been sent.",
    )


@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def login_user(request: Request, login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_data.username, login_data.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return schemas.Token(
        access_token=create_access_token(user),
        user=user,
    )


@router.get("/me", response_model=schemas.UserRead)
def read_current_user(current_user=Depends(get_current_user)):
    return current_user

@router.put("/password", response_model=schemas.UserRead)
def change_password(
    password_data: schemas.PasswordChange,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    crud.update_user_password(
        db=db,
        user=current_user,
        password_hash=hash_password(password_data.new_password),
    )

    return current_user

