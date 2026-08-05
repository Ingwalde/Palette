from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, schemas
from ..database import get_db
from ..email_service import send_password_reset_email, send_verification_email
from ..rate_limit import limiter
from ..security import (
    authenticate_user,
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    create_refresh_token,
    decode_email_verification_token,
    decode_password_reset_token,
    get_current_user,
    hash_password,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_VERIFY_LINK_INVALID = "Invalid or expired verification link"
_RESET_LINK_INVALID = "Invalid or expired password reset link"
_RESET_GENERIC_MESSAGE = "If that email is registered, a password reset link has been sent."


async def _issue_tokens(db: AsyncSession, user) -> schemas.Token:
    return schemas.Token(
        access_token=create_access_token(user),
        refresh_token=await create_refresh_token(db, user),
        user=user,
    )


@router.post("/register", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
async def register_user(
    request: Request,
    user_data: schemas.UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    if await crud.get_user_by_username(db, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already registered",
        )

    if await crud.get_user_by_email(db, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    user = await crud.create_user(
        db=db,
        user_data=user_data,
        password_hash=hash_password(user_data.password),
        is_admin=False,
    )

    token = create_email_verification_token(user.id)
    background_tasks.add_task(send_verification_email, user.email, user.username, token)

    return user


@router.get("/verify", response_model=schemas.Token)
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    user_id = decode_email_verification_token(token)

    if user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_VERIFY_LINK_INVALID)

    user = await crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_VERIFY_LINK_INVALID)

    if not user.email_verified:
        await crud.set_email_verified(db, user)

    # Log the user straight in from the email link.
    return await _issue_tokens(db, user)


@router.post("/resend-verification", response_model=schemas.MessageResponse)
@limiter.limit("3/hour")
async def resend_verification(
    request: Request,
    payload: schemas.ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    user = await crud.get_user_by_email(db, payload.email)

    # Only send for an existing, still-unverified account, but always return the same
    # generic message so the endpoint cannot be used to probe which emails are registered.
    if user is not None and not user.email_verified:
        token = create_email_verification_token(user.id)
        background_tasks.add_task(send_verification_email, user.email, user.username, token)

    return schemas.MessageResponse(
        message="If that email is registered and unverified, a verification link has been sent.",
    )


@router.post("/forgot-password", response_model=schemas.MessageResponse)
@limiter.limit("3/hour")
async def forgot_password(
    request: Request,
    payload: schemas.ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    user = await crud.get_user_by_email(db, payload.email)

    # Only send for an existing account, but always return the same generic message so the
    # endpoint cannot be used to probe which emails are registered.
    if user is not None:
        token = create_password_reset_token(user.id)
        background_tasks.add_task(send_password_reset_email, user.email, user.username, token)

    return schemas.MessageResponse(message=_RESET_GENERIC_MESSAGE)


@router.post("/reset-password", response_model=schemas.MessageResponse)
@limiter.limit("5/hour")
async def reset_password(
    request: Request,
    payload: schemas.ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    user_id = decode_password_reset_token(payload.token)

    if user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_RESET_LINK_INVALID)

    user = await crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_RESET_LINK_INVALID)

    await crud.update_user_password(db, user, hash_password(payload.new_password))
    # Log out any existing sessions once the password changes.
    await crud.revoke_all_refresh_tokens(db, user.id)

    return schemas.MessageResponse(message="Your password has been reset. You can now log in.")


@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
async def login_user(
    request: Request, login_data: schemas.UserLogin, db: AsyncSession = Depends(get_db)
):
    user = await authenticate_user(db, login_data.username, login_data.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return await _issue_tokens(db, user)


@router.post("/refresh", response_model=schemas.Token)
@limiter.limit("30/minute")
async def refresh_tokens(
    request: Request,
    payload: schemas.RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await rotate_refresh_token(db, payload.refresh_token)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user, new_refresh_token = result
    return schemas.Token(
        access_token=create_access_token(user),
        refresh_token=new_refresh_token,
        user=user,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: schemas.RefreshRequest, db: AsyncSession = Depends(get_db)):
    # Revoke the refresh token server-side (access tokens expire on their own).
    await revoke_refresh_token(db, payload.refresh_token)


@router.get("/me", response_model=schemas.UserRead)
def read_current_user(current_user=Depends(get_current_user)):
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    payload: schemas.AccountDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Re-authenticate before an irreversible account deletion.
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is incorrect",
        )

    # Refuse to delete the last admin, otherwise the admin panel becomes unreachable.
    if await crud.is_only_admin(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the only admin account",
        )

    await crud.delete_user(db, current_user)


@router.put("/password", response_model=schemas.UserRead)
async def change_password(
    password_data: schemas.PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    await crud.update_user_password(
        db=db,
        user=current_user,
        password_hash=hash_password(password_data.new_password),
    )

    return current_user
