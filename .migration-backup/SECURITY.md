# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please do NOT open a public issue.

Instead, send an email to [INSERT SECURITY EMAIL]. Please include:

* A description of the vulnerability
* Steps to reproduce the issue
* Potential impact assessment
* Any suggested fixes (if known)

We will review the report and respond within 48 hours. Once verified, we will
work on a fix and coordinate a release timeline with you.

## Security Best Practices

### For Users

1. **Never commit sensitive data**: Do not commit `.env` files, API keys, or secrets
2. **Use strong passwords**: Use strong, unique passwords for all accounts
3. **Keep dependencies updated**: Regularly update dependencies to get security patches
4. **Enable HTTPS**: Always use HTTPS in production
5. **Review environment variables**: Ensure all secrets are properly configured

### For Developers

1. **Input validation**: Always validate and sanitize user input
2. **Parameterized queries**: Use parameterized database queries to prevent SQL injection
3. **Authentication**: Use JWT tokens with proper expiration
4. **Rate limiting**: Implement rate limiting on public endpoints
5. **CORS**: Configure CORS properly for your domain
6. **Dependencies**: Regularly audit dependencies for vulnerabilities
7. **Secrets management**: Use environment variables or secret management services

### Known Security Considerations

- The application uses OpenAI API for AI features. Ensure your API key is kept secure.
- File uploads are limited by size (configurable via UPLOAD_MAX_SIZE_MB).
- All passwords are hashed using bcrypt.
- JWT tokens have configurable expiration time.

## Security Updates

Security updates will be announced in:
- GitHub Security Advisories
- Release notes
- CHANGELOG.md

We encourage all users to update to the latest secure version as soon as possible.
