import datetime as dt

from pep_sphinx_extensions import generate_rss

from .conftest import PEP_ROOT


def test__format_rfc_2822():
    # Arrange
    datetime = dt.datetime(2025, 3, 20, 12, 34, 56)

    # Act
    result = generate_rss._format_rfc_2822(datetime)

    # Assert
    assert result == "Thu, 20 Mar 2025 12:34:56 GMT"


def test_pep_abstract():
    # Arrange
    full_path = PEP_ROOT / "pep-0008.rst"

    # Act
    result = generate_rss.pep_abstract(full_path)

    # Assert
    assert result == dt.datetime(2000, 3, 1, 0, 0)
