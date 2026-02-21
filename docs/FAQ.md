# TestTrack Pro - Frequently Asked Questions (FAQ)

Common questions and answers about TestTrack Pro.

## Table of Contents

- [General](#general)
- [Getting Started](#getting-started)
- [Test Cases](#test-cases)
- [Test Execution](#test-execution)
- [Bug Tracking](#bug-tracking)
- [Bug Fix Documentation](#bug-fix-documentation-new-in-v062)
- [Analytics & Reports](#analytics--reports)
- [Flaky Tests](#flaky-tests-new-in-v062)
- [Users & Permissions](#users--permissions)
- [Integration](#integration)
- [Troubleshooting](#troubleshooting)
- [Billing & Plans](#billing--plans)

---

## General

### What is TestTrack Pro?

TestTrack Pro is a comprehensive test management platform for QA teams to manage the complete testing lifecycle - from creating test cases to executing tests, tracking bugs, and generating analytics.

### Who should use TestTrack Pro?

- **QA Teams**: Manage test cases and executions
- **Testers**: Execute tests and report bugs
- **Developers**: Track and fix reported bugs
- **Project Managers**: Monitor testing progress and metrics
- **Product Owners**: View quality metrics and reports

### Is TestTrack Pro free?

Pricing depends on deployment:
- **Self-hosted**: Free and open-source (MIT License)
- **Cloud version**: Check pricing page for plans

### What browsers are supported?

TestTrack Pro works on modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

### Is my data secure?

Yes! Security features include:
- ✅ Encrypted passwords (bcrypt)
- ✅ HTTPS/SSL encryption
- ✅ JWT authentication
- ✅ RBAC permissions
- ✅ CSRF protection
- ✅ Regular security audits
- ✅ Audit logging

---

## Getting Started

### How do I create an account?

1. Click **Sign Up** on the login page
2. Fill in name, email, password, and role
3. Click **Create Account**
4. Verify your email
5. Log in and start using TestTrack Pro

### I didn't receive the verification email. What should I do?

- Check your spam/junk folder
- Wait a few minutes (email may be delayed)
- Click **Resend Verification Email** on login page
- Contact support if still not received

### How do I reset my password?

1. Click **Forgot Password?** on login page
2. Enter your email address
3. Check email for reset link
4. Click link and enter new password
5. Log in with new password

### Can I change my email address?

Yes, in **Settings** → **Profile** → **Change Email**. You'll need to verify the new email address.

### How do I invite team members?

**Admins only:**
1. Go to **Admin** → **Users**
2. Click **+ Invite User**
3. Enter email and assign role
4. Click **Send Invitation**
5. User receives email invitation

---

## Test Cases

### What's the difference between test type and test priority?

- **Test Type**: Category of test (Functional, Integration, Regression, etc.)
- **Priority**: How important the test is (P0 = Critical, P4 = Low)

### Can I import existing test cases?

Yes! Go to **Test Cases** → **Import**:
- Supported formats: CSV, JSON, Excel
- Map columns to fields
- Preview before importing
- Bulk import hundreds of test cases

### How do I organize test cases?

**Multiple organization methods:**
- **Tags**: Add tags like `#smoke`, `#regression`
- **Modules**: Group by application module
- **Suites**: Create test suites for related tests
- **Projects**: Separate by project

### Can I reuse test cases?

Yes, use **Clone** feature:
1. Open test case
2. Click **Clone**
3. Modify as needed
4. Save as new test case

### What's the maximum number of test steps?

No hard limit, but we recommend:
- **Optimal**: 5-10 steps per test
- **Maximum**: 20 steps
- **Best practice**: Split complex tests into multiple test cases

### Can I attach files to test cases?

Yes, attach reference files:
- Requirements documents
- Design mockups
- Sample data files
- Maximum 10MB per file

---

## Test Execution

### How do I execute a test?

1. Go to **Test Executions**
2. Click **+ New Execution**
3. Select test case or suite
4. Click **Start Execution**
5. Mark each step as Pass/Fail/Skip/Blocked
6. Click **Complete Execution**

### Can I pause and resume execution?

Yes! Click **Save & Exit** during execution:
- Progress is automatically saved
- Resume anytime from **Test Executions** → **In Progress**
- Execution expires after 24 hours of inactivity

### What types of evidence can I attach?

Supported file types:
- **Images**: PNG, JPG, GIF (max 10MB)
- **Videos**: MP4, WebM (max 50MB)
- **Documents**: PDF, DOCX (max 10MB)
- **Logs**: TXT, LOG (max 5MB)

### Can multiple people execute the same test?

Yes, but:
- Each execution is separate
- Multiple executions can run simultaneously
- Results are tracked independently

### How do I view execution history?

1. Open any test case
2. Click **Execution History** tab
3. View all past executions
4. Filter by date, status, or executor

### What happens if a test step fails?

You can:
- Mark step as **Failed**
- Add failure notes
- Attach evidence (screenshot)
- **Report Bug** directly from failed step
- Continue with remaining steps or abort

---

## Bug Tracking

### How do I report a bug?

**Two methods:**

**From failed test:**
1. During test execution, mark step as Failed
2. Click **Report Bug**
3. Details auto-filled from test
4. Add additional info
5. Submit

**Manually:**
1. Go to **Bugs** → **+ New Bug**
2. Fill in bug details
3. Attach evidence
4. Assign to developer
5. Submit

### What's the difference between severity and priority?

- **Severity**: Technical impact (Critical = system crash, Trivial = typo)
- **Priority**: Business urgency (P0 = fix immediately, P4 = fix eventually)

**Example:**
- Typo on homepage: Severity=Trivial, Priority=P1 (high visibility)
- Crash in admin panel: Severity=Critical, Priority=P2 (affects few users)

### Can I link a bug to multiple test cases?

Yes:
1. Open bug
2. Click **Linked Test Cases**
3. Click **+ Link Test**
4. Search and select test cases
5. Save

### How do I track bug status?

Bug lifecycle:
1. **OPEN**: Newly reported
2. **IN_PROGRESS**: Developer working on fix
3. **RESOLVED**: Fix completed
4. **VERIFIED**: Fix verified by tester
5. **CLOSED**: Confirmed working
6. **REOPENED**: Issue still exists

### Can I export bug reports?

Yes:
1. Go to **Bugs**
2. Apply filters
3. Click **Export**
4. Choose format (PDF, Excel, CSV)
5. Download

---

## Bug Fix Documentation — NEW in v0.6.2

### What is bug fix documentation?

Bug fix documentation is a new feature that allows developers to document how they fixed bugs, including:
- **Fix Strategy**: How you fixed the issue
- **Root Cause Analysis**: Why the bug occurred
- **Root Cause Category**: Type of issue (Implementation Error, Design Defect, etc.)
- **Git Traceability**: Link to commit, branch, and code review
- **Version Tracking**: Target version and estimated fix hours

This creates valuable institutional knowledge and helps track root causes.

### Who can document bug fixes?

Only **Developers** can document fixes for bugs assigned to them:
- Developers can view bugs assigned to them
- Developers can document the fix
- **Developers CANNOT verify fixes** (only Testers and Admins)
- This separation prevents developers from closing their own work without independent verification

### How do I document a bug fix?

1. Open a bug assigned to you
2. Make code changes and commit
3. Click **Document Fix** button
4. Fill in the form:
   - **Fix Strategy**: Describe how you fixed it
   - **Root Cause Analysis**: Explain why it happened
   - **Root Cause Category**: Select from categories (Implementation Error, Design Defect, Configuration Issue, Dependency Bug, Environment Issue, Etc.)
   - **Git Information**: Paste commit hash, branch name, PR link
   - **Version Info**: Target version and hours spent
5. Click **Save Fix Documentation**
6. Update bug status to **Fixed**
7. A tester or admin will verify the fix

### What are the root cause categories?

When documenting a fix, choose the most appropriate category:

- **DESIGN_DEFECT**: Issue in architecture or system design
- **IMPLEMENTATION_ERROR**: Code logic or implementation mistake
- **CONFIGURATION_ISSUE**: Wrong settings, deployment config, or environment variables
- **DEPENDENCY_BUG**: Issue in third-party library or external code
- **ENVIRONMENT_ISSUE**: Problem with testing/staging/production environment
- **ENVIRONMENTAL_CHANGE**: External system, API, or integration changed
- **DOCUMENTATION_ERROR**: Misunderstood requirement or unclear specification

### Can I edit fix documentation after saving?

Currently, fix documentation is write-once. To update it:
1. You can contact an admin to modify it
2. Or wait for fix to be verified/rejected
3. If rejected, you can update and document again

### What happens after I document a fix?

The workflow:
1. You document the fix and set status to **Fixed**
2. A **Tester or Admin** reviews your fix
3. If tests pass: Status → **VERIFIED** → **CLOSED** ✅
4. If tests fail: Status → **REOPENED** → You fix again
5. Bug fix documentation is preserved for history

### Can I see other developers' fix documentation?

Yes! You can view:
- Your own fix documentation
- Team members' fix documentation (if you have access to the project)
- Fix documentation helps the team learn from common issues

---

## Analytics & Reports

### What metrics does the dashboard show?

**Key metrics:**
- Total test cases
- Active executions
- Open bugs
- Pass rate (%)
- Test coverage
- Team activity

**Charts:**
- Execution trends (pass/fail over time)
- Bug distribution (by severity)
- Test coverage (by module)
- **NEW in v0.6.2**: Bug trends and developer analytics

### Can I create custom reports?

Yes:
1. Go to **Analytics** → **Custom Reports**
2. Select report type
3. Choose date range
4. Apply filters
5. Configure visualizations
6. Save or export

### How do I schedule automated reports?

1. Go to **Analytics** → **Scheduled Reports**
2. Click **+ New Schedule**
3. Select report type
4. Choose frequency (daily/weekly/monthly)
5. Add recipient emails
6. Save

### What export formats are available?

- **PDF**: Formatted, printable reports
- **Excel**: Raw data with charts
- **CSV**: Data export for analysis
- **JSON**: API-compatible format

### Can I share reports with external stakeholders?

Yes:
1. Generate report
2. Export to PDF
3. Share via email or link
4. Or add external email to scheduled reports

---

## Flaky Tests — NEW in v0.6.2

### What are flaky tests?

Flaky tests are tests that sometimes pass and sometimes fail, even when the application code hasn't changed. This is problematic because:
- ❌ They're unreliable for catching real bugs
- ❌ They waste developer time investigating false positives
- ❌ They reduce confidence in test results

### How does flaky test detection work?

TestTrack Pro analyzes execution history to find tests with:
- **Both passes AND failures** with the same code
- **High variance** in execution patterns
- **Inconsistent results** over multiple runs

### How do I view flaky tests?

1. Go to **Analytics** → **Flaky Tests**
2. Set a threshold (e.g., 30% flake rate)
3. View tests that exceed that threshold
4. Click test to see execution history
5. Identify the pattern causing failures

**What the data shows:**
- **Flake Rate**: Percentage of failures (Example: 35% means fails 35 times out of 100 runs)
- **Total Runs**: How many times the test was executed
- **Pass Count**: Number of passes
- **Fail Count**: Number of failures

### What causes test flakiness?

Common causes:
- **Timing issues**: Test completes before element loads (use proper waits)
- **External dependencies**: API or database queries incomplete
- **Resource contention**: Race conditions or shared state
- **Environment variability**: Differences in test environment
- **Incomplete cleanup**: Previous test data affecting current test
- **Date/time dependencies**: Tests using current date

### How do I fix a flaky test?

**General approach:**
1. Review the test's execution history
2. Look at failed runs vs. passing runs
3. Identify what's different
4. Common fixes:
   - Add explicit waits for elements
   - Clear test data between runs
   - Mock external dependencies
   - Remove timing dependencies
   - Increase timeouts for slow operations

**Example: Fix a timing issue**

```javascript
// ❌ FLAKY: Element might not be loaded
button.click(); // Could fail if button not ready

// ✅ FIXED: Wait for element to be ready
await waitForElement(button, { timeout: 5000 });
button.click();
```

### How do I know if my fix worked?

After fixing a flaky test:
1. Run the test multiple times (10+)
2. Check **Analytics** → **Flaky Tests**
3. Look for the test in the list
4. If **flake rate drops below your threshold**: ✅ Fixed!
5. If still listed: More investigation needed

### Should I disable flaky tests?

**No**, it's better to fix them because they test real functionality. Disabling them means:
- You lose test coverage
- Bugs in that area might go undetected
- Focus on understanding and fixing the root cause

### Can I set different flake thresholds?

Yes:
1. **Analytics** → **Flaky Tests**
2. Adjust the threshold slider at the top
3. Lower threshold = stricter detection
4. Default is 30% (tests failing 30% of the time or more)

---

## Users & Permissions

### What are the different user roles?

| Role | Access Level |
|------|--------------|
| **Admin** | Full system access, user management |
| **Tester** | Create & execute tests, report bugs |
| **Developer** | View tests, manage assigned bugs |
| **Guest** | Read-only access |

See [FEATURES.md](./FEATURES.md#role-based-access-control-rbac) for detailed permissions.

### How do I change my role?

Only **Admins** can change user roles:
1. Admin goes to **Admin** → **Users**
2. Selects user
3. Changes role
4. Saves

### Can I have multiple roles?

No, each user has one role. Choose the role that best matches primary responsibilities.

### How many users can I add?

Depends on deployment:
- **Self-hosted**: Unlimited
- **Cloud version**: Based on plan

### Can I deactivate a user without deleting?

Yes (Admins only):
1. **Admin** → **Users**
2. Select user
3. Click **Deactivate**
4. User can't log in but data is preserved
5. **Reactivate** anytime

---

## Integration

### Does TestTrack Pro integrate with GitHub?

Yes! Connect to sync bugs with GitHub issues:
1. **Settings** → **Integrations** → **GitHub**
2. Click **Connect GitHub**
3. Authorize TestTrack Pro
4. Select repository
5. Bugs auto-create as GitHub issues

### Can I integrate with Jira?

Jira integration is **coming soon** (on roadmap).

### Is there an API?

Yes! Full REST API:
- **Documentation**: Visit `/docs` on API server
- **Authentication**: JWT tokens or API keys
- **Format**: JSON requests/responses
- See [API-REFERENCE.md](./API-REFERENCE.md)

### Can I automate test execution?

**Currently**: Manual execution only

**Coming soon**: Integration with:
- Selenium
- Cypress
- Playwright
- Other automation frameworks

### How do I set up email notifications?

**Admin setup:**
1. Sign up for a Resend account at https://resend.com
2. Get your API key from https://resend.com/api-keys
3. Configure Resend settings in `.env`:
   ```
   RESEND_API_KEY=your_api_key_here
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```
   For testing, you can use: `onboarding@resend.dev`
4. Restart server

**User preferences:**
1. **Settings** → **Notifications**
2. Toggle email notifications
3. Choose events to notify
4. Save

---

## Troubleshooting

### I can't log in. What should I do?

**Checklist:**
1. ✅ Verify email and password are correct
2. ✅ Check if email is verified (check inbox)
3. ✅ Account not locked (wait 30 min after failed attempts)
4. ✅ Clear browser cache and cookies
5. ✅ Try different browser
6. ✅ Reset password if unsure

Still can't log in? Contact support.

### Page is loading slowly

**Troubleshooting:**
1. Check internet connection
2. Clear browser cache
3. Disable browser extensions
4. Try different browser
5. Check if many users online (shared instance)

**Admin can check:**
- Database performance
- Server resources
- Redis cache status
- Error logs

### Uploaded file not appearing

**Common causes:**
1. File too large (check limits)
2. Unsupported file type
3. Network interruption during upload
4. Cloud storage (Cloudinary) misconfigured

**Solutions:**
- Compress large files
- Convert to supported format
- Retry upload
- Contact admin to check storage

### Not receiving notifications

**Check:**
1. **Settings** → **Notifications** → Enabled?
2. Email in spam/junk folder?
3. Email server configured (admin)?
4. Browser notifications enabled?

### Changes not saving

**Try:**
1. Check internet connection
2. Refresh page
3. Log out and log back in
4. Clear browser cache
5. Check browser console for errors (F12)

### Test execution stuck "In Progress"

**Causes:**
- Lost connection during execution
- Browser closed before completing
- Session timeout

**Solution:**
1. Go to **Test Executions** → **In Progress**
2. Click execution
3. Click **Resume** or **Abandon**

### API returning 401 Unauthorized

**Causes:**
- Token expired
- Invalid token
- Missing Authorization header

**Solutions:**
1. Refresh access token using refresh token
2. Re-authenticate to get new token
3. Verify header: `Authorization: Bearer <token>`

---

## Billing & Plans

### Is TestTrack Pro open source?

Yes! MIT License:
- Free to use
- Free to modify
- Free to distribute
- Self-host on your infrastructure

### Is there a cloud-hosted version?

Check project website for cloud offering and pricing.

### What's included in the free version?

Everything! All features are available:
- Unlimited users (self-hosted)
- Unlimited test cases
- Unlimited projects
- All integrations
- Full API access

### Do I need to pay for updates?

No, all updates are free:
- Security patches
- Bug fixes
- New features
- Performance improvements

### Can I get support?

**Community support:**
- GitHub Issues
- Documentation
- Community forum

**Premium support** (if available):
- Email support
- Priority bug fixes
- Custom features
- Training

---

## Technical Questions

### What are the system requirements?

**Minimum:**
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- 2GB RAM
- 10GB storage

**Recommended:**
- 4GB+ RAM
- SSD storage
- Dedicated PostgreSQL instance

See [DEVELOPMENT.md](./DEVELOPMENT.md) for details.

### Can I run TestTrack Pro offline?

**Backend:** Yes, on local network  
**Frontend:** Requires internet for CDN assets (can be self-hosted)  
**Full offline:** Possible with modifications

### How do I backup my data?

See [BACKUP-RESTORE.md](./BACKUP-RESTORE.md):
- Automated daily backups
- Manual backup scripts
- Database export
- File storage backup

### Is TestTrack Pro scalable?

Yes:
- Horizontal scaling (multiple servers)
- Database clustering
- Redis clustering
- Load balancing
- CDN integration

### What database is used?

**PostgreSQL 15+** for relational data:
- User accounts
- Projects
- Test cases
- Bugs
- Executions

**Redis** for:
- Session storage
- Caching
- Real-time pub/sub

---

## Still Have Questions?

### Documentation
- [Getting Started Guide](./GETTING-STARTED.md)
- [Features Guide](./FEATURES.md)
- [API Reference](./API-REFERENCE.md)
- [Development Guide](./DEVELOPMENT.md)

### Support Channels
- **Email**: support@testtrackpro.com
- **GitHub**: Open an issue
- **Community**: Join our forum
- **Chat**: In-app chat support

### Contributing
Want to contribute? See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Can't find your question?** Submit a question on GitHub or email us!
