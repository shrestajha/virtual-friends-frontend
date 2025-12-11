# Backend Database Schema Fix Required

## Problem

The backend is trying to query `participants.email` but this column doesn't exist in the database.

**Error:**
```
column participants.email does not exist
LINE 1: SELECT participants.id AS participants_id, participants.email AS participants_email...
```

## Current Database Schema (from plan)

The `participants` table should have:
- `id` (serial PK)
- `survey_unlocked` (boolean)

**Missing:** `email` column

## Solution Options

### Option 1: Add Email Column (Recommended)

Add an `email` column to the `participants` table:

```sql
ALTER TABLE participants ADD COLUMN email VARCHAR(255) UNIQUE;
CREATE INDEX idx_participants_email ON participants(email);
```

Then update the backend code to:
1. Store email when creating a participant
2. Look up participants by email

### Option 2: Use User ID from Auth Token

Instead of using email, use the user ID from the JWT token:

1. Extract `user_id` from the auth token
2. Look up participant by `user_id` (requires adding `user_id` column to `participants` table)
3. Or create a mapping table: `user_participants` with `user_id` and `participant_id`

### Option 3: Use Participant ID Directly

If the frontend can get the participant ID from `/auth/me`:
1. Add `participant_id` to the user object returned by `/auth/me`
2. Frontend uses that ID instead of email

## Frontend Impact

The frontend is currently calling:
```
GET /mongo/participants/{email}
```

This will work once the backend schema is fixed.

## Recommended Approach

**Option 1 (Add Email Column)** is the simplest and matches the integration guide:
- Email addresses work as participant IDs
- Auto-initialization can create participants with email
- No changes needed to frontend

