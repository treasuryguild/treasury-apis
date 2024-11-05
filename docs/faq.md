---
layout: default
title: FAQ
nav_order: 6
---

# Frequently Asked Questions

## General Questions

### How do I get an API key?
Contact andretreasuryguild on Discord to request an API key. Please include:
- Your intended use case
- Your Discord handle
- Project/Organization name (if applicable)

### Which API should I use?
- **Contributors API**: For basic contributor and wallet mapping
- **Wallets API**: For Discord handle and wallet address associations
- **Recognitions API**: For detailed recognition/reward data from the Treasury Guild Database

### Are there any rate limits?
Currently, there are no strict rate limits, but we recommend implementing caching and being mindful of request frequency.

## Technical Questions

### Why am I getting a 403 error?
This typically means:
- Your API key is missing
- Your API key is invalid
- The API key is not being sent in the correct header format

### How do I handle pagination?
Currently, our APIs return all results in a single response. We recommend using query parameters to filter data when possible.

### Can I use the API in frontend applications?
For security reasons, we recommend making API calls from your backend server to protect your API key.

### Why are some wallet addresses filtered out?
The Wallet Collector API filters addresses to ensure they:
- Start with "addr"
- Are at least 55 characters long
- Have associated Discord handles

## Data Questions

### What date format should I use?
Use the DD.MM.YY format for date parameters (e.g., "01.01.24")

### How recent is the data?
Data is updated in real-time as transactions and recognitions are processed.

### Can I get historical data?
Yes, use the date range parameters (startDate and endDate) in the Recognitions API.