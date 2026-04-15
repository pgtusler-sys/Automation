# Analyst Role Applications — OpenClaw End-to-End Instructions

Generated: 2026-04-15
Total: 10 applications (sorted by score, highest first)

## SETUP — Run once before starting

On your VPS, start the PDF file server:
```bash
cd /path/to/applications-analyst/
bash serve-pdfs.sh
```
This serves PDFs at `http://localhost:9111/` — the prompts below use JavaScript
to fetch from that URL and inject files into upload fields without the native file dialog.

---

## [1/10] Paddle — GTM Operations Analyst (Score: 92)

```
Apply to the GTM Operations Analyst position at Paddle. Complete the entire application end-to-end including file uploads.

Job URL: https://himalayas.app/companies/paddle/jobs/gtm-operations-analyst

STEP 1 — Navigate and find the application form:
1. Go to the job URL above
2. Click "Apply" or "Apply Now" — follow any redirects to the actual application form

STEP 2 — Fill all text fields:
- First Name: Perry
- Last Name: Tusler
- Email: pgtusler@gmail.com
- Phone: 608-332-9579
- LinkedIn: www.linkedin.com/in/Perry-Tusler
- Location: Los Angeles, CA

STEP 3 — Upload resume (bypass file dialog using browser console):
1. Open the browser developer console (press F12, click Console tab)
2. Paste and run this JavaScript:

fetch('http://localhost:9111/paddle/resume.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Resume.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[0].files = dt.files;
    inputs[0].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Resume uploaded successfully');
  });

3. Verify the filename appears in the upload field
4. If there is a SECOND file upload field for cover letter, run:

fetch('http://localhost:9111/paddle/cover-letter.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Cover_Letter.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[1].files = dt.files;
    inputs[1].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Cover letter uploaded successfully');
  });

5. Close the developer console (press F12 again)

STEP 4 — Answer screening questions:
- Years of experience in GTM/Revenue Operations: 3+ years (dedicated ops work within sales roles over 10+ year career)
- CRM experience: HubSpot, Salesforce — administration, hygiene, forecasting
- Preferred start date: Flexible / 2 weeks notice
- Work authorization: Authorized to work in the US, no sponsorship needed
- Salary expectations: $100,000 - $130,000 depending on total comp package

STEP 5 — Submit:
1. Take a screenshot of the completed form
2. Click Submit
3. Take a screenshot of the confirmation page

SAFETY: If CAPTCHA appears or account creation is required, abort and let me know.
```

---

## [2/10] Tebra — Lead Sales & Growth Operations Analyst (Score: 92)

```
Apply to the Lead Sales & Growth Operations Analyst position at Tebra via Greenhouse. Complete the entire application end-to-end including file uploads.

Job URL: https://job-boards.greenhouse.io/tebra/jobs/4641537005

STEP 1 — Navigate:
1. Go to the job URL above
2. Scroll down to the application form (Greenhouse shows the form on the same page)

STEP 2 — Fill all text fields:
- First Name: Perry
- Last Name: Tusler
- Email: pgtusler@gmail.com
- Phone: 608-332-9579
- LinkedIn Profile: www.linkedin.com/in/Perry-Tusler
- Location: Los Angeles, CA

STEP 3 — Upload resume (bypass file dialog using browser console):
1. Open the browser developer console (press F12, click Console tab)
2. Paste and run this JavaScript:

fetch('http://localhost:9111/tebra-sales-ops/resume.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Resume.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[0].files = dt.files;
    inputs[0].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Resume uploaded successfully');
  });

3. Verify the filename appears in the upload field
4. If there is a SECOND file upload field for cover letter, run:

fetch('http://localhost:9111/tebra-sales-ops/cover-letter.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Cover_Letter.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[1].files = dt.files;
    inputs[1].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Cover letter uploaded successfully');
  });

5. Close the developer console

STEP 4 — Answer screening questions:
- Years of experience in Sales/Revenue Operations: 10+ years across SaaS, B2B, and financial services
- CRM tools: HubSpot (Marketing Hub, Sales Hub, Operations Hub), Salesforce
- Analytics experience: Pipeline analytics, funnel analysis, growth metrics, forecasting
- Are you authorized to work in the US? Yes
- Do you require sponsorship? No
- Salary expectations: $127,000 - $145,000 (within posted range)

STEP 5 — Submit:
1. Take a screenshot of the completed form
2. Click "Submit Application"
3. Take a screenshot of the confirmation page

SAFETY: If CAPTCHA appears or account creation is required, abort and let me know.
```

---

## [3/10] Anaconda — GTM Operations Analyst (Score: 91, DEADLINE: 04/24/2026)

```
Apply to the GTM Operations Analyst (Partnerships and Sales) position at Anaconda. DEADLINE: 04/24/2026. Complete the entire application end-to-end including file uploads.

Job URL: https://ats.rippling.com/anaconda/jobs/2d7c1c17-7dcf-465b-94a3-f2db6ee46d86

STEP 1 — Navigate:
1. Go to the job URL above
2. Click "Apply" or "Apply Now"

STEP 2 — Fill all text fields:
- First Name: Perry
- Last Name: Tusler
- Email: pgtusler@gmail.com
- Phone: 608-332-9579
- LinkedIn: www.linkedin.com/in/Perry-Tusler
- Location: Los Angeles, CA

STEP 3 — Upload resume (bypass file dialog using browser console):
1. Open the browser developer console (press F12, click Console tab)
2. Paste and run this JavaScript:

fetch('http://localhost:9111/anaconda/resume.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Resume.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[0].files = dt.files;
    inputs[0].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Resume uploaded successfully');
  });

3. Verify the filename appears in the upload field
4. If there is a SECOND file upload field for cover letter, run:

fetch('http://localhost:9111/anaconda/cover-letter.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Cover_Letter.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[1].files = dt.files;
    inputs[1].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Cover letter uploaded successfully');
  });

5. Close the developer console

STEP 4 — Answer screening questions:
- Years of GTM/Sales Operations experience: 10+ years across SaaS and B2B
- CRM and automation tools: Salesforce, HubSpot, Clay.com, OpenClaw
- Partnership operations experience: Coordinated multi-stakeholder operations across 700+ enterprise accounts at RollWorks/AdRoll
- Work authorization: Authorized to work in the US, no sponsorship needed
- Salary expectations: $100,000 - $135,000

STEP 5 — Submit:
1. Take a screenshot of the completed form
2. Click Submit
3. Take a screenshot of the confirmation page

SAFETY: If CAPTCHA appears or account creation is required, abort and let me know.
```

---

## [4/10] impact.com — RevOps Analyst (Score: 91)

```
Apply to the RevOps Analyst position at impact.com. Complete the entire application end-to-end including file uploads.

Job URL: https://builtin.com/job/revops-analyst/3999430

STEP 1 — Navigate:
1. Go to the job URL above
2. Click "Apply" or "Apply Now" — follow redirects to impact.com's ATS

STEP 2 — Fill all text fields:
- First Name: Perry
- Last Name: Tusler
- Email: pgtusler@gmail.com
- Phone: 608-332-9579
- LinkedIn: www.linkedin.com/in/Perry-Tusler
- Location: Los Angeles, CA

STEP 3 — Upload resume (bypass file dialog using browser console):
1. Open the browser developer console (press F12, click Console tab)
2. Paste and run this JavaScript:

fetch('http://localhost:9111/impact-com/resume.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Resume.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[0].files = dt.files;
    inputs[0].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Resume uploaded successfully');
  });

3. Verify the filename appears
4. If there is a cover letter upload field, run:

fetch('http://localhost:9111/impact-com/cover-letter.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Cover_Letter.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[1].files = dt.files;
    inputs[1].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Cover letter uploaded successfully');
  });

5. Close the developer console

STEP 4 — Answer screening questions:
- Years of RevOps/Sales Operations experience: 10+ years across SaaS and B2B
- CRM expertise: Salesforce, HubSpot — administration, data hygiene, pipeline reporting
- Work authorization: Authorized to work in the US, no sponsorship needed
- Salary expectations: $100,000 - $113,000 (within posted range)

STEP 5 — Submit:
1. Take a screenshot of the completed form
2. Click Submit
3. Take a screenshot of the confirmation page

SAFETY: If CAPTCHA appears or account creation is required, abort and let me know.
```

---

## [5/10] Crescendo — Senior Analyst, GTM Strategy & Operations (Score: 91)

```
Apply to the Senior Analyst, GTM Strategy & Operations position at Crescendo. Complete the entire application end-to-end including file uploads.

Job URL: https://crescendoai.applytojob.com/apply/s0KUxBN6FI/Senior-Analyst-GTM-Strategy-Operations

STEP 1 — Navigate:
1. Go to the job URL above — the form should load directly on the page

STEP 2 — Fill all text fields:
- First Name: Perry
- Last Name: Tusler
- Email: pgtusler@gmail.com
- Phone: 608-332-9579
- LinkedIn: www.linkedin.com/in/Perry-Tusler
- Location: Los Angeles, CA (West Coast — preferred timezone)

STEP 3 — Upload resume (bypass file dialog using browser console):
1. Open the browser developer console (press F12, click Console tab)
2. Paste and run this JavaScript:

fetch('http://localhost:9111/crescendo/resume.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Resume.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[0].files = dt.files;
    inputs[0].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Resume uploaded successfully');
  });

3. Verify the filename appears
4. If there is a cover letter upload field, run:

fetch('http://localhost:9111/crescendo/cover-letter.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Cover_Letter.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[1].files = dt.files;
    inputs[1].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Cover letter uploaded successfully');
  });

5. Close the developer console

STEP 4 — Answer screening questions:
- Years of GTM Strategy/Sales Ops experience: 10+ years combined across SaaS and B2B
- Cross-functional experience: Sales, Customer Success, Marketing, Finance
- SaaS/B2B experience: RollWorks/AdRoll (martech SaaS), loanDepot, WeFund Mortgage
- Work authorization: Authorized to work in the US, no sponsorship needed
- Preferred timezone: Pacific (Los Angeles, CA)
- Salary expectations: $110,000 - $140,000

STEP 5 — Submit:
1. Take a screenshot of the completed form
2. Click Submit
3. Take a screenshot of the confirmation page

SAFETY: If CAPTCHA appears or account creation is required, abort and let me know.
```

---

## [6/10] Hightouch — Revenue Operations Analyst (Score: 88)

```
Apply to the Revenue Operations Analyst position at Hightouch via Greenhouse. Complete the entire application end-to-end including file uploads.

Job URL: https://job-boards.greenhouse.io/hightouch/jobs/5540583004

STEP 1 — Navigate:
1. Go to the job URL above
2. Scroll down to the application form

STEP 2 — Fill all text fields:
- First Name: Perry
- Last Name: Tusler
- Email: pgtusler@gmail.com
- Phone: 608-332-9579
- LinkedIn Profile: www.linkedin.com/in/Perry-Tusler
- Location: Los Angeles, CA

STEP 3 — Upload resume (bypass file dialog using browser console):
1. Open the browser developer console (press F12, click Console tab)
2. Paste and run this JavaScript:

fetch('http://localhost:9111/hightouch/resume.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Resume.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[0].files = dt.files;
    inputs[0].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Resume uploaded successfully');
  });

3. Verify the filename appears
4. If there is a cover letter upload field, run:

fetch('http://localhost:9111/hightouch/cover-letter.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Cover_Letter.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[1].files = dt.files;
    inputs[1].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Cover letter uploaded successfully');
  });

5. Close the developer console

STEP 4 — Answer screening questions:
- RevOps experience: 3+ years of dedicated ops work within 10+ year revenue career
- CRM proficiency: HubSpot, Salesforce — administration, data hygiene, reporting
- Data analysis tools: Excel, CRM analytics, workflow automation (Clay.com, OpenClaw)
- Work authorization: Authorized to work in the US, no sponsorship needed
- Salary expectations: $85,000 - $100,000 (within posted range)

STEP 5 — Submit:
1. Take a screenshot of the completed form
2. Click "Submit Application"
3. Take a screenshot of the confirmation page

SAFETY: If CAPTCHA appears or account creation is required, abort and let me know.
```

---

## [7/10] Trella Health — Revenue Operations Analyst (Score: 88)

```
Apply to the Revenue Operations Analyst position at Trella Health via Greenhouse. Complete the entire application end-to-end including file uploads.

Job URL: https://boards.greenhouse.io/trellahealth/jobs/5008467004

STEP 1 — Navigate:
1. Go to the job URL above
2. Scroll down to the application form

STEP 2 — Fill all text fields:
- First Name: Perry
- Last Name: Tusler
- Email: pgtusler@gmail.com
- Phone: 608-332-9579
- LinkedIn Profile: www.linkedin.com/in/Perry-Tusler
- Location: Los Angeles, CA

STEP 3 — Upload resume (bypass file dialog using browser console):
1. Open the browser developer console (press F12, click Console tab)
2. Paste and run this JavaScript:

fetch('http://localhost:9111/trella-health/resume.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Resume.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[0].files = dt.files;
    inputs[0].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Resume uploaded successfully');
  });

3. Verify the filename appears
4. If there is a cover letter upload field, run:

fetch('http://localhost:9111/trella-health/cover-letter.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Cover_Letter.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[1].files = dt.files;
    inputs[1].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Cover letter uploaded successfully');
  });

5. Close the developer console

STEP 4 — Answer screening questions:
- RevOps/Sales Ops experience: 10+ years across SaaS and B2B
- Data quality and systems integrity: Extensive — CRM hygiene, workflow troubleshooting, data governance
- Healthcare/healthtech interest: Strong interest, targeting healthtech companies
- Work authorization: Authorized to work in the US, no sponsorship needed
- Salary expectations: $90,000 - $110,000

STEP 5 — Submit:
1. Take a screenshot of the completed form
2. Click "Submit Application"
3. Take a screenshot of the confirmation page

SAFETY: If CAPTCHA appears or account creation is required, abort and let me know.
```

---

## [8/10] PushPress — Senior RevOps Analyst (Score: 86)

```
Apply to the Senior RevOps Analyst position at PushPress via Lever. Complete the entire application end-to-end including file uploads.

Job URL: https://jobs.lever.co/pushpress/c375f001-f00d-4a1a-87c4-50d3ff1454d1

STEP 1 — Navigate:
1. Go to the job URL above
2. Click "Apply for this job"

STEP 2 — Fill all text fields:
- Full Name: Perry Tusler
- Email: pgtusler@gmail.com
- Phone: 608-332-9579
- Current Company: WeFund Mortgage
- LinkedIn: www.linkedin.com/in/Perry-Tusler

STEP 3 — Upload resume (bypass file dialog using browser console):
1. Open the browser developer console (press F12, click Console tab)
2. Paste and run this JavaScript:

fetch('http://localhost:9111/pushpress/resume.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Resume.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[0].files = dt.files;
    inputs[0].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Resume uploaded successfully');
  });

3. Verify the filename appears
4. If there is a cover letter upload field, run:

fetch('http://localhost:9111/pushpress/cover-letter.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Cover_Letter.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[1].files = dt.files;
    inputs[1].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Cover letter uploaded successfully');
  });

5. Close the developer console

STEP 4 — Answer screening questions:
- HubSpot/Marketo proficiency: HubSpot (Marketing Hub, Sales Hub, Operations Hub) — extensive
- BI tools: Familiar with dashboard development, KPI tracking, performance reporting
- Marketing analytics: Built automated workflows connecting marketing engagement to pipeline performance at RollWorks/AdRoll
- Work authorization: Authorized to work in the US, no sponsorship needed
- Salary expectations: $100,000 - $120,000

STEP 5 — Submit:
1. Take a screenshot of the completed form
2. Click "Submit Application"
3. Take a screenshot of the confirmation page

SAFETY: If CAPTCHA appears or account creation is required, abort and let me know.
```

---

## [9/10] Samsara — Sales Strategy Analyst (Score: 86)

```
Apply to the Sales Strategy Analyst (Emerging Sales) position at Samsara. Complete the entire application end-to-end including file uploads.

Job URL: https://www.samsara.com/company/careers/roles/7296894

STEP 1 — Navigate:
1. Go to the job URL above
2. Click "Apply" or "Apply Now" — should open a Greenhouse form

STEP 2 — Fill all text fields:
- First Name: Perry
- Last Name: Tusler
- Email: pgtusler@gmail.com
- Phone: 608-332-9579
- LinkedIn Profile: www.linkedin.com/in/Perry-Tusler
- Location: Los Angeles, CA

STEP 3 — Upload resume (bypass file dialog using browser console):
1. Open the browser developer console (press F12, click Console tab)
2. Paste and run this JavaScript:

fetch('http://localhost:9111/samsara/resume.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Resume.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[0].files = dt.files;
    inputs[0].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Resume uploaded successfully');
  });

3. Verify the filename appears
4. If there is a cover letter upload field, run:

fetch('http://localhost:9111/samsara/cover-letter.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Cover_Letter.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[1].files = dt.files;
    inputs[1].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Cover letter uploaded successfully');
  });

5. Close the developer console

STEP 4 — Answer screening questions:
- 0→1 building experience: Built operational infrastructure from scratch at WeFund Mortgage and emerging account processes at RollWorks/AdRoll
- Sales strategy experience: 10+ years combining sales execution with strategic operations
- Current location: Los Angeles, CA (not in excluded SF/NYC/DC metro areas)
- Work authorization: Authorized to work in the US, no sponsorship needed
- Salary expectations: $100,000 - $117,000

STEP 5 — Submit:
1. Take a screenshot of the completed form
2. Click "Submit Application"
3. Take a screenshot of the confirmation page

SAFETY: If CAPTCHA appears or account creation is required, abort and let me know.
```

---

## [10/10] Creyos — Revenue Operations Analyst (Score: 84)

```
Apply to the Revenue Operations Analyst position at Creyos. Complete the entire application end-to-end including file uploads.

Job URL: https://dynamitejobs.com/company/creyos/remote-job/revenue-operations-analyst

STEP 1 — Navigate:
1. Go to the job URL above
2. Click "Apply" — may redirect to Creyos careers page or Workable ATS

STEP 2 — Fill all text fields:
- First Name: Perry
- Last Name: Tusler
- Email: pgtusler@gmail.com
- Phone: 608-332-9579
- LinkedIn: www.linkedin.com/in/Perry-Tusler
- Location: Los Angeles, CA

STEP 3 — Upload resume (bypass file dialog using browser console):
1. Open the browser developer console (press F12, click Console tab)
2. Paste and run this JavaScript:

fetch('http://localhost:9111/creyos/resume.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Resume.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[0].files = dt.files;
    inputs[0].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Resume uploaded successfully');
  });

3. Verify the filename appears
4. If there is a cover letter upload field, run:

fetch('http://localhost:9111/creyos/cover-letter.pdf')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'Perry_Tusler_Cover_Letter.pdf', {type: 'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs[1].files = dt.files;
    inputs[1].dispatchEvent(new Event('change', {bubbles: true}));
    console.log('Cover letter uploaded successfully');
  });

5. Close the developer console

STEP 4 — Answer screening questions:
- RevOps experience: 3+ years dedicated ops work within 10+ year revenue career
- Cross-functional alignment: Extensive — sales, marketing, customer success coordination
- SaaS experience: RollWorks/AdRoll (B2B SaaS)
- Healthcare/healthtech interest: Yes
- Work authorization: Authorized to work in the US, no sponsorship needed
- Salary expectations: $85,000 - $100,000

STEP 5 — Submit:
1. Take a screenshot of the completed form
2. Click Submit
3. Take a screenshot of the confirmation page

SAFETY: If CAPTCHA appears or account creation is required, abort and let me know.
```
