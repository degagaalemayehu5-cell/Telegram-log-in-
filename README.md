📁 Project Title: Telegram Auth Flow & Session Vulnerability Research
Subtitle: A Proof-of-Concept (PoC) for educational security analysis of session-based authentication.

🛡️ Educational Disclaimer
IMPORTANT: This repository is for educational and research purposes only. It was created as part of a senior engineering study to demonstrate how session-hijacking and credential-phishing vulnerabilities operate in modern messaging ecosystems.

Prohibited Use: This code must not be used for any malicious activity or unauthorized access to data.

Compliance: The author does not condone or support any illegal use of this software.

📑 Project Overview
This project is a Full-Stack Security Simulation designed to analyze the "Man-in-the-Middle" (MitM) and social engineering vectors used to compromise Telegram sessions. It explores the intersection of web-based authentication and API-level session persistence.

🔍 Vulnerability Analysis (The "Why")
This research focuses on three primary security weaknesses:

Social Engineering Hooks: How attackers use specific language (e.g., "Critical Login Alert") to bypass user caution.

Visual Deception: Using Markdown and look-alike URLs to mask the true destination of a link.

Session Persistence: Demonstrating how a captured session_string can allow persistent access even if a password is changed (unless 2FA is active).



Environment Isolation: This project is tested using dedicated "Test Accounts" to ensure no real user data is ever at risk.


Degaga Alemayehu Electrical & Computer Engineering Student | Full-Stack Developer
