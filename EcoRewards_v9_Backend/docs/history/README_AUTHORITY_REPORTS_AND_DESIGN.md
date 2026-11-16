# EcoRewards — Professional Admin Refresh & PDF Authority Reporting

## What's new
- Cleaner administration sidebar and professional, responsive layout.
- A dedicated **Authority reports** workspace with three clearly separated steps:
  1. Choose from date / to date, optional region, suburb and issue category.
  2. Press **Generate PDF report**. A fixed, stored PDF snapshot is created. Preview/download it.
  3. Enter the recipient email address, confirm the recipient and sharing permission, then **Send PDF by email**.
- Past PDF snapshots and email attempts remain available in the history, with delivery status.
- Generated reports use real report records in the selected date range and show summary counts and a record table without phone numbers, user emails, photographs or exact coordinates.
- ReportLab is included as an additional Python dependency.

## Start locally
1. Back up your old EcoRewards folder. Extract this ZIP to a new folder.
2. Start **XAMPP MySQL**. Configure `backend/.env` with your database details (do not share passwords).
3. Run `START_ECOREWARDS.bat` from the EcoRewards directory.
4. Log in with an admin account and choose **Admin intelligence** -> **Authority reports** (or open http://127.0.0.1:5000/admin/intelligence).
5. Select dates, generate the PDF, and preview or download it.

## Sending emails — optional setup
PDF generation and downloading work without an email provider. To actually send, add the following to `backend/.env`:

    SMTP_HOST=your.smtp.provider
    SMTP_PORT=587
    SMTP_USER=your-smtp-username
    SMTP_PASSWORD=your-app-password-or-token
    SMTP_FROM=your-authorised-sender@example.org

Restart the app after editing. The app uses SMTP with STARTTLS. The Send button makes one explicit submission; no emails are sent simply by generating a PDF. Use a test inbox first. An SMTP success response confirms message acceptance by the email server, **not council receipt, acceptance or formal reporting compliance**. Verify that the target address accepts this kind of submission before sending anything.

## Data and safety notes
- The PDF is generated from a fixed snapshot in MySQL, and **Send PDF** attaches those exact saved PDF bytes.
- New tables: `authority_pdf_reports` and `authority_pdf_sends`. They are automatically created during backend initialisation.
- The report uses creation dates (UTC) and current task statuses. It is not a historical status-event calculation.
- The admin region/suburb mapping is an illustrative list; validate it against official GIS boundaries before operational usage.
- AI hazards and photo privacy are limited by the existing implementation and require real-world validation.
- Never send reports containing actual personal information without a lawful purpose, appropriate approvals and required privacy assessment.

## Testing completed in the packaging environment
- Existing suite: 11 / 11 passing.
- Python compilation and JavaScript syntax checks passed.
- A sample PDF was generated successfully and opened with a PDF reader.
- **Not verified:** full end-to-end XAMPP MySQL integration, SMTP transmission or real browser visual rendering in this environment.
