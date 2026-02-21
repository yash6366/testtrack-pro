# TestTrack Pro - API Error Codes

Complete reference for all API error responses, status codes, and error handling.

## Error Response Format

All API errors follow a consistent JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "statusCode": 400,
    "details": {
      "field": "additional context",
      "value": "invalid value"
    }
  }
}
```

## HTTP Status Codes

### Success Codes (2xx)

| Code | Name | Description |
|------|------|-------------|
| `200` | OK | Request succeeded |
| `201` | Created | Resource successfully created |
| `204` | No Content | Request succeeded with no response body |

### Client Error Codes (4xx)

| Code | Name | Description | Example |
|------|------|-------------|---------|
| `400` | Bad Request | Invalid request parameters | Validation errors, malformed JSON |
| `401` | Unauthorized | Authentication required or failed | Missing/invalid JWT token |
| `403` | Forbidden | Insufficient permissions | User lacks required role/permission |
| `404` | Not Found | Resource doesn't exist | Test case ID not found |
| `409` | Conflict | Resource already exists | Duplicate email registration |
| `422` | Unprocessable Entity | Valid request but can't be processed | Business logic validation failure |
| `429` | Too Many Requests | Rate limit exceeded | More than 100 requests in 15 minutes |

### Server Error Codes (5xx)

| Code | Name | Description | Example |
|------|------|-------------|---------|
| `500` | Internal Server Error | Unexpected server error | Database connection failure |
| `502` | Bad Gateway | Upstream service error | External API failure |
| `503` | Service Unavailable | Temporary server unavailable | Maintenance mode |
| `504` | Gateway Timeout | Upstream service timeout | Slow external API response |

## Error Codes Reference

### Authentication Errors (AUTH_*)

#### AUTH_001 - Invalid Credentials
```json
{
  "error": {
    "code": "AUTH_001",
    "message": "Invalid email or password",
    "statusCode": 401
  }
}
```
**Cause**: Login attempt with incorrect credentials  
**Solution**: Verify email and password are correct

#### AUTH_002 - Token Expired
```json
{
  "error": {
    "code": "AUTH_002",
    "message": "JWT token has expired",
    "statusCode": 401
  }
}
```
**Cause**: Access token has expired  
**Solution**: Use refresh token to get new access token

#### AUTH_003 - Invalid Token
```json
{
  "error": {
    "code": "AUTH_003",
    "message": "Invalid or malformed JWT token",
    "statusCode": 401
  }
}
```
**Cause**: Token is invalid, malformed, or tampered with  
**Solution**: Re-authenticate to get valid token

#### AUTH_004 - Email Not Verified
```json
{
  "error": {
    "code": "AUTH_004",
    "message": "Email address not verified",
    "statusCode": 403,
    "details": {
      "email": "user@example.com"
    }
  }
}
```
**Cause**: Attempting to login with unverified email  
**Solution**: Check email for verification link

#### AUTH_005 - Account Locked
```json
{
  "error": {
    "code": "AUTH_005",
    "message": "Account locked due to multiple failed login attempts",
    "statusCode": 403,
    "details": {
      "lockedUntil": "2024-01-20T15:30:00Z"
    }
  }
}
```
**Cause**: Too many failed login attempts  
**Solution**: Wait 30 minutes or contact support

#### AUTH_006 - Refresh Token Invalid
```json
{
  "error": {
    "code": "AUTH_006",
    "message": "Refresh token is invalid or expired",
    "statusCode": 401
  }
}
```
**Cause**: Refresh token expired or doesn't exist  
**Solution**: User must re-authenticate

### Authorization Errors (AUTHZ_*)

#### AUTHZ_001 - Insufficient Permissions
```json
{
  "error": {
    "code": "AUTHZ_001",
    "message": "Insufficient permissions to perform this action",
    "statusCode": 403,
    "details": {
      "required": "test:delete",
      "userRole": "GUEST"
    }
  }
}
```
**Cause**: User lacks required permission  
**Solution**: Request access from admin or use account with proper role

#### AUTHZ_002 - Resource Access Denied
```json
{
  "error": {
    "code": "AUTHZ_002",
    "message": "You don't have access to this resource",
    "statusCode": 403,
    "details": {
      "resourceType": "testCase",
      "resourceId": 123
    }
  }
}
```
**Cause**: Attempting to access resource user doesn't own  
**Solution**: Request access from resource owner

### Validation Errors (VAL_*)

#### VAL_001 - Required Field Missing
```json
{
  "error": {
    "code": "VAL_001",
    "message": "Required field is missing",
    "statusCode": 400,
    "details": {
      "field": "name",
      "location": "body"
    }
  }
}
```
**Cause**: Required field not provided in request  
**Solution**: Include all required fields

#### VAL_002 - Invalid Field Format
```json
{
  "error": {
    "code": "VAL_002",
    "message": "Field has invalid format",
    "statusCode": 400,
    "details": {
      "field": "email",
      "value": "invalid-email",
      "expected": "valid email address"
    }
  }
}
```
**Cause**: Field value doesn't match expected format  
**Solution**: Provide value in correct format

#### VAL_003 - Value Out of Range
```json
{
  "error": {
    "code": "VAL_003",
    "message": "Field value is out of acceptable range",
    "statusCode": 400,
    "details": {
      "field": "priority",
      "value": "P10",
      "allowed": ["P0", "P1", "P2", "P3", "P4"]
    }
  }
}
```
**Cause**: Value not in allowed set  
**Solution**: Use one of the allowed values

#### VAL_004 - Invalid Data Type
```json
{
  "error": {
    "code": "VAL_004",
    "message": "Field has incorrect data type",
    "statusCode": 400,
    "details": {
      "field": "projectId",
      "received": "string",
      "expected": "number"
    }
  }
}
```
**Cause**: Field value is wrong data type  
**Solution**: Provide value in expected data type

### Resource Errors (RES_*)

#### RES_001 - Not Found
```json
{
  "error": {
    "code": "RES_001",
    "message": "Resource not found",
    "statusCode": 404,
    "details": {
      "resourceType": "testCase",
      "resourceId": 999
    }
  }
}
```
**Cause**: Requested resource doesn't exist  
**Solution**: Verify resource ID is correct

#### RES_002 - Already Exists
```json
{
  "error": {
    "code": "RES_002",
    "message": "Resource already exists",
    "statusCode": 409,
    "details": {
      "resourceType": "user",
      "field": "email",
      "value": "user@example.com"
    }
  }
}
```
**Cause**: Attempting to create duplicate resource  
**Solution**: Use existing resource or choose unique identifier

#### RES_003 - Deleted
```json
{
  "error": {
    "code": "RES_003",
    "message": "Resource has been deleted",
    "statusCode": 410,
    "details": {
      "resourceType": "testCase",
      "resourceId": 123,
      "deletedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```
**Cause**: Resource was soft-deleted  
**Solution**: Restore resource or create new one

#### RES_004 - Cannot Delete (Dependencies)
```json
{
  "error": {
    "code": "RES_004",
    "message": "Cannot delete resource with existing dependencies",
    "statusCode": 422,
    "details": {
      "resourceType": "project",
      "resourceId": 5,
      "dependencies": {
        "testCases": 45,
        "bugs": 12
      }
    }
  }
}
```
**Cause**: Resource has dependent resources  
**Solution**: Delete dependencies first or use cascade delete

### Business Logic Errors (BUS_*)

#### BUS_001 - Invalid State Transition
```json
{
  "error": {
    "code": "BUS_001",
    "message": "Invalid state transition",
    "statusCode": 422,
    "details": {
      "currentState": "DRAFT",
      "requestedState": "APPROVED",
      "requiredState": "IN_REVIEW"
    }
  }
}
```
**Cause**: Attempting invalid status transition  
**Solution**: Follow valid state transition workflow

#### BUS_002 - Operation Not Allowed
```json
{
  "error": {
    "code": "BUS_002",
    "message": "Operation not allowed in current state",
    "statusCode": 422,
    "details": {
      "operation": "execute",
      "currentStatus": "DEPRECATED",
      "allowedStatuses": ["APPROVED"]
    }
  }
}
```
**Cause**: Operation not valid for resource state  
**Solution**: Change resource state first

#### BUS_003 - Quota Exceeded
```json
{
  "error": {
    "code": "BUS_003",
    "message": "Quota exceeded for this resource type",
    "statusCode": 422,
    "details": {
      "resourceType": "project",
      "current": 10,
      "limit": 10
    }
  }
}
```
**Cause**: User/organization reached resource limit  
**Solution**: Delete unused resources or upgrade plan

#### BUS_004 - Execution Already In Progress
```json
{
  "error": {
    "code": "BUS_004",
    "message": "Test execution already in progress",
    "statusCode": 409,
    "details": {
      "testCaseId": 123,
      "existingExecutionId": 456
    }
  }
}
```
**Cause**: Cannot start new execution while one is active  
**Solution**: Complete or cancel existing execution

### Database Errors (DB_*)

#### DB_001 - Connection Failed
```json
{
  "error": {
    "code": "DB_001",
    "message": "Database connection failed",
    "statusCode": 503
  }
}
```
**Cause**: Cannot connect to database  
**Solution**: Retry request, contact support if persists

#### DB_002 - Query Timeout
```json
{
  "error": {
    "code": "DB_002",
    "message": "Database query timed out",
    "statusCode": 504
  }
}
```
**Cause**: Database query took too long  
**Solution**: Retry with smaller dataset or add filters

#### DB_003 - Transaction Failed
```json
{
  "error": {
    "code": "DB_003",
    "message": "Database transaction failed",
    "statusCode": 500,
    "details": {
      "reason": "Deadlock detected"
    }
  }
}
```
**Cause**: Database transaction couldn't complete  
**Solution**: Retry request

### External Service Errors (EXT_*)

#### EXT_001 - Email Service Failed
```json
{
  "error": {
    "code": "EXT_001",
    "message": "Failed to send email",
    "statusCode": 500,
    "details": {
      "service": "Resend",
      "recipient": "user@example.com"
    }
  }
}
```
**Cause**: Email service unavailable or failed  
**Solution**: Verify Resend API key and check service status
**Solution**: User can request email resend later

#### EXT_002 - File Upload Failed
```json
{
  "error": {
    "code": "EXT_002",
    "message": "File upload to cloud storage failed",
    "statusCode": 500,
    "details": {
      "service": "Cloudinary",
      "fileName": "screenshot.png"
    }
  }
}
```
**Cause**: Cloud storage service error  
**Solution**: Retry upload

#### EXT_003 - GitHub API Failed
```json
{
  "error": {
    "code": "EXT_003",
    "message": "GitHub API request failed",
    "statusCode": 502,
    "details": {
      "endpoint": "/repos/owner/repo/issues",
      "githubError": "API rate limit exceeded"
    }
  }
}
```
**Cause**: GitHub API error or rate limit  
**Solution**: Wait and retry, or check GitHub status

### Rate Limiting Errors (RATE_*)

#### RATE_001 - Too Many Requests
```json
{
  "error": {
    "code": "RATE_001",
    "message": "Rate limit exceeded",
    "statusCode": 429,
    "details": {
      "limit": 100,
      "window": "15 minutes",
      "retryAfter": 300
    }
  }
}
```
**Cause**: Exceeded API rate limit  
**Solution**: Wait specified seconds before retry

#### RATE_002 - Concurrent Request Limit
```json
{
  "error": {
    "code": "RATE_002",
    "message": "Too many concurrent requests",
    "statusCode": 429,
    "details": {
      "limit": 10,
      "active": 11
    }
  }
}
```
**Cause**: Too many simultaneous requests  
**Solution**: Wait for active requests to complete

### File Upload Errors (FILE_*)

#### FILE_001 - File Too Large
```json
{
  "error": {
    "code": "FILE_001",
    "message": "File size exceeds maximum allowed",
    "statusCode": 413,
    "details": {
      "fileSize": 15728640,
      "maxSize": 10485760,
      "maxSizeMB": 10
    }
  }
}
```
**Cause**: Uploaded file exceeds size limit  
**Solution**: Compress file or upload smaller file

#### FILE_002 - Invalid File Type
```json
{
  "error": {
    "code": "FILE_002",
    "message": "File type not allowed",
    "statusCode": 400,
    "details": {
      "fileType": "application/exe",
      "allowedTypes": ["image/png", "image/jpeg", "application/pdf"]
    }
  }
}
```
**Cause**: File type not in allowed list  
**Solution**: Convert file to allowed format

#### FILE_003 - Malicious File Detected
```json
{
  "error": {
    "code": "FILE_003",
    "message": "File failed security scan",
    "statusCode": 400
  }
}
```
**Cause**: File contains malicious content  
**Solution**: Upload different file

### Fix Documentation Errors (FIX_*) — NEW in v0.6.2

#### FIX_001 - Invalid Root Cause Category
```json
{
  "error": {
    "code": "FIX_001",
    "message": "Invalid root cause category",
    "statusCode": 400,
    "details": {
      "provided": "UNKNOWN_CAUSE",
      "allowed": ["DESIGN_DEFECT", "IMPLEMENTATION_ERROR", "CONFIGURATION_ISSUE", "DEPENDENCY_BUG", "ENVIRONMENT_ISSUE", "ENVIRONMENTAL_CHANGE", "DOCUMENTATION_ERROR"]
    }
  }
}
```
**Cause**: Root cause category not in allowed list  
**Solution**: Use one of the allowed root cause categories

#### FIX_002 - Invalid Git Information
```json
{
  "error": {
    "code": "FIX_002",
    "message": "Invalid git information provided",
    "statusCode": 400,
    "details": {
      "field": "gitCommitHash",
      "reason": "Commit hash must be 40 characters"
    }
  }
}
```
**Cause**: Git commit hash, branch, or PR URL format is invalid  
**Solution**: Provide valid git information (40-char hex commit hash, valid branch name, valid GitHub PR URL)

#### FIX_003 - Cannot Document Fix for Closed Bug
```json
{
  "error": {
    "code": "FIX_003",
    "message": "Cannot document fix for a closed or non-existent bug",
    "statusCode": 422,
    "details": {
      "bugId": 42,
      "bugStatus": "CLOSED"
    }
  }
}
```
**Cause**: Attempting to document fix for bug that's already closed or doesn't exist  
**Solution**: Bug must be in OPEN, REOPENED, or IN_PROGRESS status

#### FIX_004 - Fix Documentation Already Exists
```json
{
  "error": {
    "code": "FIX_004",
    "message": "Fix documentation already exists for this bug",
    "statusCode": 409,
    "details": {
      "bugId": 42,
      "existingFixDocumentationId": 128
    }
  }
}
```
**Cause**: Bug already has fix documentation; only one fix doc per bug allowed  
**Solution**: Update existing fix documentation instead

#### FIX_005 - Missing Required Fix Documentation Fields
```json
{
  "error": {
    "code": "FIX_005",
    "message": "Missing required fix documentation fields",
    "statusCode": 400,
    "details": {
      "missingFields": ["fixStrategy", "rootCauseAnalysis", "rootCauseCategory"]
    }
  }
}
```
**Cause**: One or more required fields missing from fix documentation  
**Solution**: Provide all required fields: fixStrategy, rootCauseAnalysis, rootCauseCategory

#### FIX_006 - Developer Cannot Verify Own Fix
```json
{
  "error": {
    "code": "FIX_006",
    "message": "Developers cannot verify their own bug fixes",
    "statusCode": 422,
    "details": {
      "bugId": 42,
      "developerId": 5
    }
  }
}
```
**Cause**: Only Testers and Admins can verify fixes; Developers who documented the fix cannot verify  
**Solution**: Have a different user (Tester/Admin) verify the fix

## Error Handling Best Practices

### Client-Side Handling

```javascript
try {
  const response = await api.post('/api/tests', testCaseData);
  return response.data;
} catch (error) {
  if (error.response) {
    const { code, message, details } = error.response.data.error;
    
    switch (code) {
      case 'AUTH_002': // Token expired
        await refreshToken();
        return retryRequest();
        
      case 'VAL_001': // Validation error
        showValidationError(details.field, message);
        break;
        
      case 'AUTHZ_001': // Permission denied
        redirectToAccessDenied();
        break;
        
      case 'RATE_001': // Rate limit
        setTimeout(() => retryRequest(), details.retryAfter * 1000);
        break;
        
      default:
        showGenericError(message);
    }
  }
}
```

### Retry Logic

```javascript
async function requestWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const code = error.response?.data?.error?.code;
      
      // Retry on server errors and timeouts
      if (['DB_001', 'DB_002', 'EXT_001'].includes(code)) {
        if (i < maxRetries - 1) {
          await delay(1000 * Math.pow(2, i)); // Exponential backoff
          continue;
        }
      }
      
      throw error;
    }
  }
}
```

### User-Friendly Messages

Map technical error codes to user-friendly messages:

```javascript
const ERROR_MESSAGES = {
  'AUTH_001': 'The email or password you entered is incorrect.',
  'AUTH_004': 'Please verify your email address to continue.',
  'RES_001': 'The item you\'re looking for doesn\'t exist.',
  'RATE_001': 'You\'re making requests too quickly. Please wait a moment.',
  'FILE_001': 'Your file is too large. Please upload a file under 10MB.'
};

function getUserMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || 'An unexpected error occurred. Please try again.';
}
```

## Support

If you encounter an error not documented here:
1. Check server logs for details
2. Verify request format against API documentation
3. Contact support with error code and request ID

## Related Documentation

- [API Reference](./API-REFERENCE.md)
- [Security Guidelines](./SECURITY.md)
- [Development Guide](./DEVELOPMENT.md)
