from pydantic import BaseModel, EmailStr

class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str | None = None
    role: str

    class Config:
        from_attributes = True

class UserUpdateIn(BaseModel):
    name: str | None = None
    new_password: str | None = None
    old_password: str | None = None