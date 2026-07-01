# Contributing to AI Brain OS

Thank you for your interest in contributing to AI Brain OS! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to maintain a welcoming and inclusive community.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Environment details (OS, Python/Node versions)
- Relevant logs or error messages

### Suggesting Enhancements

Enhancement suggestions are welcome. Please provide:

- A clear description of the enhancement
- Use cases for the enhancement
- Potential implementation approach (if known)

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write tests for new functionality
5. Ensure all tests pass
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Setup

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your configuration
npm run dev
```

### Coding Standards

- **Python**: Follow PEP 8 style guidelines
- **TypeScript**: Follow existing code style
- **Commit Messages**: Use conventional commit format
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `refactor:` for code refactoring
  - `test:` for test additions/changes

### Testing

- Write tests for new features
- Ensure all existing tests pass
- Aim for good test coverage

## Questions?

Feel free to open an issue for questions or discussions about the project.
