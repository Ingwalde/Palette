from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..security import authenticate_user, create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
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

    return crud.create_user(
        db=db,
        user_data=user_data,
        password_hash=hash_password(user_data.password),
        is_admin=False,
    )


@router.post("/login", response_model=schemas.Token)
def login_user(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
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

