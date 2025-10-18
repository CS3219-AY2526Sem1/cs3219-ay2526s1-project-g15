from pydantic import BaseModel, EmailStr, Field

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str | None = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class AuthOut(BaseModel):
    access_token: str
    refresh_token: str
    refresh_token_id: str

class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ResetPasswordIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=8)

class VerifyCodeIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)

class PasswordVerifyIn(BaseModel):
    password: str = Field(min_length=8)