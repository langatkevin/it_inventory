from fastapi import Depends
from sqlalchemy.orm import Session

from ..db import get_session


def get_db(session: Session = Depends(get_session)) -> Session:
    return session
